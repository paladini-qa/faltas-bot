require('dotenv').config();
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

let db = null;

async function getDb() {
  if (db) return db;
  // Resolve base directory outside the packaged executable's snapshot
  const isPackaged = typeof process.pkg !== 'undefined';
  const baseDir = isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname, '../');
  const dbPath = path.join(baseDir, 'faltas-bot.db');
  
  db = await sqlite.open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  // Enable foreign key constraints
  await db.run('PRAGMA foreign_keys = ON;');
  return db;
}

async function initSchema() {
  const database = await getDb();
  await database.exec(`
    CREATE TABLE IF NOT EXISTS alunos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT    NOT NULL,
      numero    INTEGER,
      turma     TEXT    NOT NULL DEFAULT '',
      serie     TEXT    NOT NULL DEFAULT '',
      curso     TEXT    NOT NULL DEFAULT '',
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(nome, turma, serie, curso)
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id  INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      nome      TEXT    NOT NULL,
      telefone  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faltas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      data        TEXT    NOT NULL,
      disciplina  TEXT    NOT NULL DEFAULT '',
      justificada INTEGER NOT NULL DEFAULT 0,
      criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(aluno_id, data, disciplina)
    );

    CREATE TABLE IF NOT EXISTS alertas_enviados (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      tipo_alerta TEXT    NOT NULL,
      enviado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    INSERT INTO configuracoes (chave, valor) VALUES
      ('threshold_consecutivas', '3'),
      ('threshold_mensal', '5'),
      ('template_consecutivas', 'Olá {responsavel}! Tudo bem? Notamos que {aluno} possui {faltas} faltas consecutivas. Entre em contato com a escola para mais informações.'),
      ('template_mensal', 'Olá {responsavel}! Tudo bem? Notamos que {aluno} possui {faltas} faltas no período de 1 mês. Entre em contato com a escola para mais informações.')
    ON CONFLICT (chave) DO NOTHING;
  `);
}

// Returns { id, novo: boolean }
async function upsertAluno({ nome, numero, turma = '', serie = '', curso = '' }) {
  const database = await getDb();
  let aluno = await database.get(
    'SELECT id, numero FROM alunos WHERE nome = ? AND turma = ? AND serie = ? AND curso = ?',
    [nome, turma, serie, curso]
  );
  let novo = false;
  let id;
  if (!aluno) {
    const result = await database.run(
      'INSERT INTO alunos (nome, numero, turma, serie, curso) VALUES (?, ?, ?, ?, ?)',
      [nome, numero ?? null, turma, serie, curso]
    );
    id = result.lastID;
    novo = true;
  } else {
    id = aluno.id;
    if (aluno.numero !== numero) {
      await database.run('UPDATE alunos SET numero = ? WHERE id = ?', [numero ?? null, id]);
    }
  }
  return { id, novo };
}

// Returns true if a new record was inserted, false if already existed
async function insertFalta({ alunoId, data, disciplina = '', justificada = false }) {
  const database = await getDb();
  try {
    const result = await database.run(
      `INSERT INTO faltas (aluno_id, data, disciplina, justificada)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (aluno_id, data, disciplina) DO NOTHING`,
      [alunoId, data, disciplina, justificada ? 1 : 0]
    );
    return result.changes > 0;
  } catch (err) {
    return false;
  }
}

async function getAlunosSemResponsavel() {
  const database = await getDb();
  return await database.all(`
    SELECT a.* FROM alunos a
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
    WHERE r.id IS NULL
    ORDER BY a.nome
  `);
}

async function getDashboardStats() {
  const database = await getDb();
  const stats = await database.get(`
    SELECT
      (SELECT COUNT(*) FROM alunos)                          AS total_alunos,
      (SELECT COUNT(*) FROM faltas WHERE justificada = 0)    AS total_faltas,
      (SELECT COUNT(*) FROM alertas_enviados)                AS total_alertas,
      (SELECT COUNT(*) FROM (
        SELECT aluno_id FROM faltas WHERE justificada = 0
        GROUP BY aluno_id HAVING COUNT(*) >= 5
      ) sub) AS alunos_em_risco
  `);
  
  const topRisco = await database.all(`
    SELECT a.id, a.nome, a.turma, a.serie,
      SUM(CASE WHEN f.justificada = 0 THEN 1 ELSE 0 END) AS faltas_injustificadas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    GROUP BY a.id, a.nome, a.turma, a.serie
    HAVING SUM(CASE WHEN f.justificada = 0 THEN 1 ELSE 0 END) >= 5
    ORDER BY faltas_injustificadas DESC
    LIMIT 5
  `);
  
  return { ...stats, top_risco: topRisco };
}

async function getAlunos({ q, turma, serie, curso, risco } = {}) {
  const database = await getDb();
  const conditions = [];
  const params = [];

  if (q) { params.push(`%${q}%`); conditions.push(`a.nome LIKE ?`); }
  if (turma) { params.push(turma); conditions.push(`a.turma = ?`); }
  if (serie) { params.push(serie); conditions.push(`a.serie = ?`); }
  if (curso) { params.push(curso); conditions.push(`a.curso = ?`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let having = '';
  if (risco === 'alto') having = 'HAVING SUM(CASE WHEN f.justificada = 0 THEN 1 ELSE 0 END) >= 10';
  else if (risco === 'risco' || risco === 'medio') having = 'HAVING SUM(CASE WHEN f.justificada = 0 THEN 1 ELSE 0 END) >= 5 AND SUM(CASE WHEN f.justificada = 0 THEN 1 ELSE 0 END) < 10';

  const rows = await database.all(`
    SELECT
      a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em,
      COUNT(DISTINCT f.id)                                           AS total_faltas,
      COUNT(DISTINCT CASE WHEN f.justificada = 0 THEN f.id END)      AS faltas_injustificadas,
      COUNT(DISTINCT r.id)                                           AS total_responsaveis
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
    ${where}
    GROUP BY a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em
    ${having}
    ORDER BY a.nome
  `, params);
  return rows;
}

async function getAlunoById(id) {
  const database = await getDb();
  const aluno = await database.get(`
    SELECT
      a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em,
      COUNT(DISTINCT f.id)                                      AS total_faltas,
      COUNT(DISTINCT CASE WHEN f.justificada = 0 THEN f.id END) AS faltas_injustificadas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    WHERE a.id = ?
    GROUP BY a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em
  `, [id]);

  if (!aluno) return null;

  const responsaveis = await database.all(
    'SELECT * FROM responsaveis WHERE aluno_id = ? ORDER BY nome',
    [id]
  );

  const faltas = await database.all(
    'SELECT * FROM faltas WHERE aluno_id = ? ORDER BY data DESC, disciplina',
    [id]
  );

  const mappedFaltas = faltas.map(f => ({
    ...f,
    justificada: f.justificada === 1
  }));

  return {
    ...aluno,
    responsaveis,
    faltas: mappedFaltas
  };
}

async function insertResponsavel({ alunoId, nome, telefone }) {
  const database = await getDb();
  const result = await database.run(
    'INSERT INTO responsaveis (aluno_id, nome, telefone) VALUES (?, ?, ?)',
    [alunoId, nome, telefone]
  );
  return { id: result.lastID, aluno_id: alunoId, nome, telefone };
}

async function deleteResponsavel(id) {
  const database = await getDb();
  const result = await database.run('DELETE FROM responsaveis WHERE id = ?', [id]);
  return result.changes > 0;
}

async function getAlertas({ limit = 50 } = {}) {
  const database = await getDb();
  return await database.all(`
    SELECT ae.*, a.nome AS aluno_nome, a.turma, a.serie
    FROM alertas_enviados ae
    JOIN alunos a ON a.id = ae.aluno_id
    ORDER BY ae.enviado_em DESC
    LIMIT ?
  `, [limit]);
}

async function getFiltros() {
  const database = await getDb();
  const turmas = await database.all("SELECT DISTINCT turma FROM alunos WHERE turma <> '' AND turma IS NOT NULL ORDER BY turma");
  const series = await database.all("SELECT DISTINCT serie FROM alunos WHERE serie <> '' AND serie IS NOT NULL ORDER BY serie");
  const cursos = await database.all("SELECT DISTINCT curso FROM alunos WHERE curso <> '' AND curso IS NOT NULL ORDER BY curso");
  
  return {
    turmas: turmas.map(r => r.turma),
    series: series.map(r => r.serie),
    cursos: cursos.map(r => r.curso),
  };
}

async function getConfiguracoes() {
  const database = await getDb();
  const rows = await database.all('SELECT chave, valor FROM configuracoes');
  return Object.fromEntries(rows.map(r => [r.chave, r.valor]));
}

async function saveConfiguracoes(data) {
  const database = await getDb();
  for (const [chave, valor] of Object.entries(data)) {
    await database.run(
      'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor',
      [chave, String(valor)]
    );
  }
}

async function updateAluno(id, { nome, turma, serie, curso, numero }) {
  const database = await getDb();
  await database.run(
    `UPDATE alunos SET nome=?, turma=?, serie=?, curso=?, numero=? WHERE id=?`,
    [nome, turma ?? '', serie ?? '', curso ?? '', numero ?? null, id]
  );
  return await database.get('SELECT * FROM alunos WHERE id = ?', [id]);
}

async function deleteAluno(id) {
  const database = await getDb();
  const result = await database.run('DELETE FROM alunos WHERE id=?', [id]);
  return result.changes > 0;
}

async function deleteAlunosBulk(ids) {
  if (!ids || ids.length === 0) return;
  const database = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await database.run(`DELETE FROM alunos WHERE id IN (${placeholders})`, ids);
}

async function updateResponsavel(id, { nome, telefone }) {
  const database = await getDb();
  await database.run(
    'UPDATE responsaveis SET nome=?, telefone=? WHERE id=?',
    [nome, telefone, id]
  );
  return await database.get('SELECT * FROM responsaveis WHERE id = ?', [id]);
}

async function updateFalta(id, { data, disciplina, justificada }) {
  const database = await getDb();
  await database.run(
    `UPDATE faltas SET data=?, disciplina=?, justificada=? WHERE id=?`,
    [data, disciplina ?? '', justificada ? 1 : 0, id]
  );
  const row = await database.get('SELECT * FROM faltas WHERE id = ?', [id]);
  if (row) {
    row.justificada = row.justificada === 1;
  }
  return row || null;
}

async function deleteFalta(id) {
  const database = await getDb();
  const result = await database.run('DELETE FROM faltas WHERE id=?', [id]);
  return result.changes > 0;
}

async function deleteAlerta(id) {
  const database = await getDb();
  const result = await database.run('DELETE FROM alertas_enviados WHERE id=?', [id]);
  return result.changes > 0;
}

// ─── High-Level Helpers for Decoupled System Architecture ─────────────────────

async function alertaJaEnviado(alunoId, tipo) {
  const database = await getDb();
  const row = await database.get(
    `SELECT id FROM alertas_enviados
     WHERE aluno_id = ? AND tipo_alerta = ?
       AND enviado_em > datetime('now', '-30 days')`,
    [alunoId, tipo]
  );
  return !!row;
}

async function registrarAlerta(alunoId, tipo) {
  const database = await getDb();
  await database.run(
    'INSERT INTO alertas_enviados (aluno_id, tipo_alerta) VALUES (?, ?)',
    [alunoId, tipo]
  );
}

async function getAlunosComFaltas() {
  const database = await getDb();
  const alunos = await database.all('SELECT id, nome FROM alunos');
  const faltas = await database.all('SELECT aluno_id, data FROM faltas WHERE justificada = 0 ORDER BY data');
  
  const faltasPorAluno = {};
  for (const f of faltas) {
    if (!faltasPorAluno[f.aluno_id]) {
      faltasPorAluno[f.aluno_id] = [];
    }
    faltasPorAluno[f.aluno_id].push({ data: f.data });
  }
  
  return alunos.map(a => ({
    id: a.id,
    nome: a.nome,
    faltas: faltasPorAluno[a.id] || []
  }));
}

async function getAlunoStatsParaMensagem(alunoId) {
  const database = await getDb();
  const row = await database.get(`
    SELECT a.nome,
      COUNT(DISTINCT CASE WHEN f.justificada = 0 THEN f.id END) AS faltas_injustificadas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    WHERE a.id = ?
    GROUP BY a.id, a.nome
  `, [alunoId]);
  return row || null;
}

async function getResponsaveisPorAluno(alunoId) {
  const database = await getDb();
  return await database.all('SELECT nome, telefone FROM responsaveis WHERE aluno_id = ? ORDER BY nome', [alunoId]);
}

async function getResponsaveisETurmaStats(turma) {
  const database = await getDb();
  return await database.all(`
    SELECT a.id AS aluno_id, a.nome AS aluno_nome,
      COUNT(DISTINCT CASE WHEN f.justificada = 0 THEN f.id END) AS faltas_injustificadas,
      r.nome AS resp_nome, r.telefone AS resp_telefone
    FROM alunos a
    JOIN responsaveis r ON r.aluno_id = a.id
    LEFT JOIN faltas f ON f.aluno_id = a.id
    WHERE a.turma = ?
    GROUP BY a.id, a.nome, r.id, r.nome, r.telefone
  `, [turma]);
}

module.exports = {
  getDb,
  initSchema,
  upsertAluno,
  insertFalta,
  getAlunosSemResponsavel,
  getDashboardStats,
  getAlunos,
  getAlunoById,
  insertResponsavel,
  deleteResponsavel,
  getAlertas,
  getFiltros,
  getConfiguracoes,
  saveConfiguracoes,
  updateAluno,
  deleteAluno,
  deleteAlunosBulk,
  updateResponsavel,
  updateFalta,
  deleteFalta,
  deleteAlerta,
  
  // Decoupled Helper Functions
  alertaJaEnviado,
  registrarAlerta,
  getAlunosComFaltas,
  getAlunoStatsParaMensagem,
  getResponsaveisPorAluno,
  getResponsaveisETurmaStats,
};
