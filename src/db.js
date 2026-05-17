require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alunos (
      id        SERIAL PRIMARY KEY,
      nome      TEXT    NOT NULL,
      numero    INTEGER,
      turma     TEXT    NOT NULL DEFAULT '',
      serie     TEXT    NOT NULL DEFAULT '',
      curso     TEXT    NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(nome, turma, serie, curso)
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id        SERIAL PRIMARY KEY,
      aluno_id  INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      nome      TEXT    NOT NULL,
      telefone  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faltas (
      id          SERIAL PRIMARY KEY,
      aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      data        DATE    NOT NULL,
      disciplina  TEXT    NOT NULL DEFAULT '',
      justificada BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(aluno_id, data, disciplina)
    );

    CREATE TABLE IF NOT EXISTS alertas_enviados (
      id          SERIAL PRIMARY KEY,
      aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      tipo_alerta TEXT    NOT NULL,
      enviado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  const select = await pool.query(
    'SELECT id FROM alunos WHERE nome = $1 AND turma = $2 AND serie = $3 AND curso = $4',
    [nome, turma, serie, curso]
  );
  if (select.rows.length > 0) return { id: select.rows[0].id, novo: false };

  const insert = await pool.query(
    'INSERT INTO alunos (nome, numero, turma, serie, curso) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [nome, numero ?? null, turma, serie, curso]
  );
  return { id: insert.rows[0].id, novo: true };
}

// Returns true if a new record was inserted, false if already existed
async function insertFalta({ alunoId, data, disciplina = '', justificada = false }) {
  const result = await pool.query(
    `INSERT INTO faltas (aluno_id, data, disciplina, justificada)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [alunoId, data, disciplina, justificada]
  );
  return result.rowCount > 0;
}

async function getAlunosSemResponsavel() {
  const result = await pool.query(`
    SELECT a.* FROM alunos a
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
    WHERE r.id IS NULL
    ORDER BY a.nome
  `);
  return result.rows;
}

async function getDashboardStats() {
  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM alunos)::int                          AS total_alunos,
      (SELECT COUNT(*) FROM faltas WHERE justificada = FALSE)::int AS total_faltas,
      (SELECT COUNT(*) FROM alertas_enviados)::int                AS total_alertas,
      (SELECT COUNT(*) FROM (
        SELECT aluno_id FROM faltas WHERE justificada = FALSE
        GROUP BY aluno_id HAVING COUNT(*) >= 5
      ) sub)::int AS alunos_em_risco
  `);
  const topRiscoResult = await pool.query(`
    SELECT a.id, a.nome, a.turma, a.serie,
      COUNT(f.id) FILTER (WHERE f.justificada = FALSE)::int AS faltas_injustificadas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    GROUP BY a.id
    HAVING COUNT(f.id) FILTER (WHERE f.justificada = FALSE) >= 5
    ORDER BY faltas_injustificadas DESC
    LIMIT 5
  `);
  return { ...statsResult.rows[0], top_risco: topRiscoResult.rows };
}

async function getAlunos({ q, turma, serie, curso, risco } = {}) {
  const conditions = [];
  const params = [];

  if (q) { params.push(`%${q}%`); conditions.push(`a.nome ILIKE $${params.length}`); }
  if (turma) { params.push(turma); conditions.push(`a.turma = $${params.length}`); }
  if (serie) { params.push(serie); conditions.push(`a.serie = $${params.length}`); }
  if (curso) { params.push(curso); conditions.push(`a.curso = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let having = '';
  if (risco === 'alto') having = 'HAVING COUNT(f.id) FILTER (WHERE f.justificada = FALSE) >= 10';
  else if (risco === 'medio') having = 'HAVING COUNT(f.id) FILTER (WHERE f.justificada = FALSE) >= 5';

  const result = await pool.query(`
    SELECT
      a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em,
      COUNT(f.id)::int                                               AS total_faltas,
      COUNT(f.id) FILTER (WHERE f.justificada = FALSE)::int          AS faltas_injustificadas,
      COUNT(r.id)::int                                               AS total_responsaveis
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
    ${where}
    GROUP BY a.id
    ${having}
    ORDER BY a.nome
  `, params);
  return result.rows;
}

async function getAlunoById(id) {
  const alunoRes = await pool.query(`
    SELECT
      a.id, a.nome, a.numero, a.turma, a.serie, a.curso, a.criado_em,
      COUNT(f.id)::int                                      AS total_faltas,
      COUNT(f.id) FILTER (WHERE f.justificada = FALSE)::int AS faltas_injustificadas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    WHERE a.id = $1
    GROUP BY a.id
  `, [id]);

  if (alunoRes.rows.length === 0) return null;

  const respRes = await pool.query(
    'SELECT * FROM responsaveis WHERE aluno_id = $1 ORDER BY nome',
    [id]
  );

  const faltasRes = await pool.query(
    'SELECT * FROM faltas WHERE aluno_id = $1 ORDER BY data DESC, disciplina',
    [id]
  );

  return { ...alunoRes.rows[0], responsaveis: respRes.rows, faltas: faltasRes.rows };
}

async function insertResponsavel({ alunoId, nome, telefone }) {
  const result = await pool.query(
    'INSERT INTO responsaveis (aluno_id, nome, telefone) VALUES ($1, $2, $3) RETURNING *',
    [alunoId, nome, telefone]
  );
  return result.rows[0];
}

async function deleteResponsavel(id) {
  const result = await pool.query('DELETE FROM responsaveis WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function getAlertas({ limit = 50 } = {}) {
  const result = await pool.query(`
    SELECT ae.*, a.nome AS aluno_nome, a.turma, a.serie
    FROM alertas_enviados ae
    JOIN alunos a ON a.id = ae.aluno_id
    ORDER BY ae.enviado_em DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

async function getFiltros() {
  const result = await pool.query(`
    SELECT
      array_agg(DISTINCT turma ORDER BY turma) FILTER (WHERE turma <> '') AS turmas,
      array_agg(DISTINCT serie ORDER BY serie) FILTER (WHERE serie <> '') AS series,
      array_agg(DISTINCT curso ORDER BY curso) FILTER (WHERE curso <> '') AS cursos
    FROM alunos
  `);
  return result.rows[0];
}

async function getConfiguracoes() {
  const result = await pool.query('SELECT chave, valor FROM configuracoes');
  return Object.fromEntries(result.rows.map(r => [r.chave, r.valor]));
}

async function saveConfiguracoes(data) {
  for (const [chave, valor] of Object.entries(data)) {
    await pool.query(
      'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2',
      [chave, String(valor)]
    );
  }
}

async function updateAluno(id, { nome, turma, serie, curso, numero }) {
  const result = await pool.query(
    `UPDATE alunos SET nome=$1, turma=$2, serie=$3, curso=$4, numero=$5 WHERE id=$6 RETURNING *`,
    [nome, turma ?? '', serie ?? '', curso ?? '', numero ?? null, id]
  );
  return result.rows[0] || null;
}

async function deleteAluno(id) {
  const result = await pool.query('DELETE FROM alunos WHERE id=$1', [id]);
  return result.rowCount > 0;
}

async function deleteAlunosBulk(ids) {
  await pool.query('DELETE FROM alunos WHERE id = ANY($1)', [ids]);
}

async function updateResponsavel(id, { nome, telefone }) {
  const result = await pool.query(
    'UPDATE responsaveis SET nome=$1, telefone=$2 WHERE id=$3 RETURNING *',
    [nome, telefone, id]
  );
  return result.rows[0] || null;
}

async function updateFalta(id, { data, disciplina, justificada }) {
  const result = await pool.query(
    `UPDATE faltas SET data=$1, disciplina=$2, justificada=$3 WHERE id=$4 RETURNING *`,
    [data, disciplina ?? '', justificada ?? false, id]
  );
  return result.rows[0] || null;
}

async function deleteFalta(id) {
  const result = await pool.query('DELETE FROM faltas WHERE id=$1', [id]);
  return result.rowCount > 0;
}

async function deleteAlerta(id) {
  const result = await pool.query('DELETE FROM alertas_enviados WHERE id=$1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  pool,
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
};
