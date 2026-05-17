const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { upsertAluno, insertFalta } = require('./db');

const MESES = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };

// Uppercase characters found in Brazilian/Spanish names
const NOME_RE = /^[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ][A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ\s]{4,}$/;

// Header/footer keywords that are NOT student names
const SKIP_RE = /^(NOME DO ALUNO|MOV|N[º°]|Trans|ESTADO|SECRETARIA|CENTRO|TEC EM|SERIAÇÃO|TURMA|ANO |FREQUÊNCIA|FREQUENCIA|AVALIAÇÃO|AVALIACAO|CONTEÚDO|CONTEUDO|REGISTRO|IMPRESSO|IMPRESSO|Impresso|quinta|Página|Faltas|Atendimentos|EXC|Nota)/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toIso(dia, mesStr, ano) {
  const mes = MESES[mesStr.toLowerCase()];
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function brToIso(br) {
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
}

// ─── Header extraction ────────────────────────────────────────────────────────

function extrairAno(texto) {
  const m = texto.match(/ANO LETIVO:\s*(\d{4})/i);
  return m ? parseInt(m[1]) : new Date().getFullYear();
}

function extrairMeta(texto, nomeArquivo) {
  // Turma and class letter from filename (more reliable than PDF text)
  const turmaM = nomeArquivo.match(/-(Tarde|Manha|Noite|Manhã)-([A-Z])/i);
  const turma = turmaM ? `${turmaM[1]}-${turmaM[2]}` : ((texto.match(/TURMA:\s*(\S+)/i) || [])[1] || '');

  const serie = (texto.match(/(\d+[ªa°])\s*s[eé]rie/i) || [])[1] || '';

  const cursoM = texto.match(/TEC EM ([A-Z][A-Z\s]{2,30}?)(?:MEDIANEIRA|SERIAÇÃO|\n)/i);
  const curso = cursoM ? cursoM[1].trim() : '';

  return { turma, serie, curso };
}

// Extract discipline code from filename.
// e.g. "...Tarde-A-EDDIGCOMPPROGEIA1ºTrimestre" → "EDDIGCOMPPROGEIA"
function extrairDisciplina(nomeArquivo) {
  const m = nomeArquivo.match(/-([A-Z]{4,})\d/);
  return m ? m[1] : nomeArquivo;
}

// ─── Justified absences ───────────────────────────────────────────────────────

// Returns Map<nomeAluno, Set<isoDate>>
function parseJustificativas(texto) {
  // Format: "DD/MM/YYYY - DD/MM/YYYY: NOME DO ALUNO: Motivo"
  const re = /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4}):\s*([^:\n]+):/g;
  const map = new Map();
  let m;
  while ((m = re.exec(texto)) !== null) {
    const inicio = new Date(brToIso(m[1]));
    const fim = new Date(brToIso(m[2]));
    const nome = m[3].trim();
    if (!map.has(nome)) map.set(nome, new Set());
    const datas = map.get(nome);
    const d = new Date(inicio);
    while (d <= fim) {
      datas.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  }
  return map;
}

// ─── REGISTRO DE FREQUÊNCIA parser ───────────────────────────────────────────

/*
 * pdf-parse extracts each table cell onto its own line. The FREQUÊNCIA section
 * looks like this in the extracted text:
 *
 *   NOME DO ALUNO
 *   Nº
 *   MOV
 *   12
 *   fev
 *   19
 *   fev
 *   ... (all lesson dates as day/month pairs)
 *   ALEIDA VALENTINA DEL VALLE JAIMES
 *   Trans
 *   1
 *   C
 *   C
 *   C
 *   ... (nCols attendance values: C | F | -)
 *   ANA LUISA PLAUT RIOS
 *   2
 *   C
 *   ...
 *
 * We use a state machine: first collect date columns from the header, then
 * parse each student record as: NAME → [Trans] → NUMBER → N×attendance.
 */
function parseFrequencia(texto, ano) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ── 1. Find "NOME DO ALUNO" to locate the start of the frequency table ──
  const inicio = linhas.indexOf('NOME DO ALUNO');
  if (inicio === -1) return { datas: [], alunos: [] };

  let i = inicio + 1;

  // Skip column headers (Nº, MOV and variants)
  while (i < linhas.length && /^(N[º°o]|MOV)$/i.test(linhas[i])) i++;

  // ── 2. Collect lesson dates from header ──────────────────────────────────
  const datas = [];
  const seen = new Set();

  while (i < linhas.length) {
    const l1 = linhas[i];
    const l2 = linhas[i + 1] || '';
    if (/^\d{1,2}$/.test(l1) && MESES[l2.toLowerCase()]) {
      const iso = toIso(parseInt(l1), l2, ano);
      if (!seen.has(iso)) { seen.add(iso); datas.push(iso); }
      i += 2;
    } else {
      break; // end of date header, student records begin
    }
  }

  datas.sort();
  const nCols = datas.length;
  const ATT_RE = /^[CF\-]$/;

  // ── 3. Parse student records ─────────────────────────────────────────────
  const alunos = [];

  while (i < linhas.length) {
    const linha = linhas[i];

    // Stop at the page footer or next section
    if (/^quinta-feira|^AVALIA[ÇC][ÃA]O|^CONTE[ÚU]DO|^REGISTRO DE CLASSE/i.test(linha)) break;

    // Is this a student name? (all uppercase, ≥5 chars, not a header keyword)
    if (NOME_RE.test(linha) && !SKIP_RE.test(linha)) {
      const nome = linha;
      i++;

      // Optional "Trans" movement marker
      let mov = null;
      if (i < linhas.length && /^Trans$/i.test(linhas[i])) {
        mov = 'Trans';
        i++;
      }

      // Student's class number (1-99)
      if (i < linhas.length && /^\d{1,2}$/.test(linhas[i])) {
        const numero = parseInt(linhas[i]);
        i++;

        // Read exactly nCols attendance values
        const valores = [];
        while (valores.length < nCols && i < linhas.length && ATT_RE.test(linhas[i])) {
          valores.push(linhas[i]);
          i++;
        }

        const faltas = valores.reduce((acc, v, idx) => {
          if (v === 'F' && idx < datas.length) acc.push(datas[idx]);
          return acc;
        }, []);

        alunos.push({ nome, mov, numero, faltas });
      }
      // else: unexpected format, skip this line
    } else {
      i++;
    }
  }

  return { datas, alunos };
}

// ─── Main import function ─────────────────────────────────────────────────────

async function importarPdf(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const { text } = await pdfParse(buffer);

  const ano = extrairAno(text);
  const nomeArquivo = path.basename(pdfPath, '.pdf');
  const meta = extrairMeta(text, nomeArquivo);
  const disciplina = extrairDisciplina(nomeArquivo);
  const justificativas = parseJustificativas(text);

  const { datas, alunos } = parseFrequencia(text, ano);

  let novosAlunos = 0;
  let novasFaltas = 0;

  for (const aluno of alunos) {
    const { id: alunoId, novo } = await upsertAluno({
      nome: aluno.nome,
      numero: aluno.numero,
      turma: meta.turma,
      serie: meta.serie,
      curso: meta.curso,
    });
    if (novo) novosAlunos++;

    const datasJust = justificativas.get(aluno.nome) || new Set();
    for (const data of aluno.faltas) {
      const justificada = datasJust.has(data);
      if (await insertFalta({ alunoId, data, disciplina, justificada })) novasFaltas++;
    }
  }

  return {
    totalAlunos: alunos.length,
    novosAlunos,
    novasFaltas,
    datasAula: datas,
    disciplina,
    ano,
    meta,
  };
}

module.exports = { importarPdf };
