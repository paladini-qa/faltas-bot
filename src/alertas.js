const { pool } = require('./db');
const { sendMessage } = require('./whatsapp');

const MENSAGENS = {
  consecutivas: (responsavel, aluno) =>
    `Olá ${responsavel}! Tudo bem? Notamos que ${aluno} possui 3 faltas consecutivas. Entre em contato com a escola para mais informações.`,
  mensal: (responsavel, aluno) =>
    `Olá ${responsavel}! Tudo bem? Notamos que ${aluno} possui 5 faltas no período de 1 mês. Entre em contato com a escola para mais informações.`,
};

function temFaltasConsecutivas(faltas) {
  if (faltas.length < 3) return false;
  const datas = faltas
    .map(f => new Date(f.data).getTime())
    .sort((a, b) => a - b);

  let streak = 1;
  for (let i = 1; i < datas.length; i++) {
    const diffDias = (datas[i] - datas[i - 1]) / 86400000;
    if (diffDias <= 3) {
      streak++;
      if (streak >= 3) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

function temFaltasMensais(faltas) {
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  return faltas.filter(f => new Date(f.data) >= limite).length >= 5;
}

async function alertaJaEnviado(alunoId, tipo) {
  const result = await pool.query(
    `SELECT id FROM alertas_enviados
     WHERE aluno_id = $1 AND tipo_alerta = $2
       AND enviado_em > NOW() - INTERVAL '30 days'`,
    [alunoId, tipo]
  );
  return result.rows.length > 0;
}

async function registrarAlerta(alunoId, tipo) {
  await pool.query(
    'INSERT INTO alertas_enviados (aluno_id, tipo_alerta) VALUES ($1, $2)',
    [alunoId, tipo]
  );
}

async function avaliarEEnviarAlertas() {
  const alunosResult = await pool.query(`
    SELECT
      a.id, a.nome,
      json_agg(
        json_build_object('data', f.data)
        ORDER BY f.data
      ) FILTER (WHERE f.id IS NOT NULL AND f.justificada = FALSE) AS faltas
    FROM alunos a
    LEFT JOIN faltas f ON f.aluno_id = a.id
    GROUP BY a.id, a.nome
  `);

  const enviados = [];

  for (const aluno of alunosResult.rows) {
    const faltas = aluno.faltas || [];
    const tipos = [];
    if (temFaltasConsecutivas(faltas)) tipos.push('consecutivas');
    if (temFaltasMensais(faltas)) tipos.push('mensal');

    for (const tipo of tipos) {
      if (await alertaJaEnviado(aluno.id, tipo)) continue;

      const respResult = await pool.query(
        'SELECT nome, telefone FROM responsaveis WHERE aluno_id = $1',
        [aluno.id]
      );

      if (respResult.rows.length === 0) continue;

      for (const resp of respResult.rows) {
        await sendMessage(resp.telefone, MENSAGENS[tipo](resp.nome, aluno.nome));
      }

      await registrarAlerta(aluno.id, tipo);
      enviados.push({ aluno: aluno.nome, tipo, responsaveis: respResult.rows.length });
    }
  }

  return enviados;
}

module.exports = { avaliarEEnviarAlertas };
