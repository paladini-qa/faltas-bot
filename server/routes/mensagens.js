const router = require('express').Router();
const { pool } = require('../../src/db');
const { sendMessage, isClientReady } = require('../../src/whatsapp');

function substituir(template, { responsavel, aluno, faltas }) {
  return template
    .replace(/{responsavel}/g, responsavel || '')
    .replace(/{aluno}/g, aluno || '')
    .replace(/{faltas}/g, faltas != null ? String(faltas) : '');
}

router.post('/enviar', async (req, res) => {
  if (!isClientReady()) {
    return res.status(503).json({ error: 'WhatsApp não está conectado' });
  }

  const { alunoId, turma, mensagemTemplate, telefonesSelecionados } = req.body;

  if (!mensagemTemplate) {
    return res.status(400).json({ error: 'mensagemTemplate é obrigatório' });
  }

  const enviados = [];
  const erros = [];

  try {
    if (alunoId) {
      // Aluno mode
      const alunoRes = await pool.query(
        `SELECT a.nome,
           COUNT(f.id) FILTER (WHERE f.justificada = FALSE)::int AS faltas_injustificadas
         FROM alunos a
         LEFT JOIN faltas f ON f.aluno_id = a.id
         WHERE a.id = $1
         GROUP BY a.id`,
        [alunoId]
      );
      if (alunoRes.rows.length === 0) return res.status(404).json({ error: 'Aluno não encontrado' });
      const aluno = alunoRes.rows[0];

      const respRes = await pool.query(
        'SELECT nome, telefone FROM responsaveis WHERE aluno_id = $1',
        [alunoId]
      );
      const responsaveis = telefonesSelecionados
        ? respRes.rows.filter(r => telefonesSelecionados.includes(r.telefone))
        : respRes.rows;

      for (const resp of responsaveis) {
        const msg = substituir(mensagemTemplate, {
          responsavel: resp.nome,
          aluno: aluno.nome,
          faltas: aluno.faltas_injustificadas,
        });
        try {
          await sendMessage(resp.telefone, msg);
          enviados.push(resp.telefone);
        } catch (e) {
          erros.push(`${resp.telefone}: ${e.message}`);
        }
      }

      if (enviados.length > 0) {
        await pool.query(
          'INSERT INTO alertas_enviados (aluno_id, tipo_alerta) VALUES ($1, $2)',
          [alunoId, 'manual']
        );
      }

    } else if (turma) {
      // Turma mode
      const rows = await pool.query(
        `SELECT a.id AS aluno_id, a.nome AS aluno_nome,
           COUNT(f.id) FILTER (WHERE f.justificada = FALSE)::int AS faltas_injustificadas,
           r.nome AS resp_nome, r.telefone AS resp_telefone
         FROM alunos a
         JOIN responsaveis r ON r.aluno_id = a.id
         LEFT JOIN faltas f ON f.aluno_id = a.id
         WHERE a.turma = $1
         GROUP BY a.id, a.nome, r.id, r.nome, r.telefone`,
        [turma]
      );

      const alunosRegistrados = new Set();
      for (const row of rows.rows) {
        const msg = substituir(mensagemTemplate, {
          responsavel: row.resp_nome,
          aluno: row.aluno_nome,
          faltas: row.faltas_injustificadas,
        });
        try {
          await sendMessage(row.resp_telefone, msg);
          enviados.push(row.resp_telefone);
          if (!alunosRegistrados.has(row.aluno_id)) {
            await pool.query(
              'INSERT INTO alertas_enviados (aluno_id, tipo_alerta) VALUES ($1, $2)',
              [row.aluno_id, 'manual']
            );
            alunosRegistrados.add(row.aluno_id);
          }
        } catch (e) {
          erros.push(`${row.resp_telefone}: ${e.message}`);
        }
      }
    } else {
      return res.status(400).json({ error: 'alunoId ou turma é obrigatório' });
    }

    res.json({ enviados: enviados.length, erros });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
