const { pool, getConfiguracoes } = require('./db');
const { sendMessage } = require('./whatsapp');

function substituir(template, { responsavel, aluno, faltas }) {
  return template
    .replace(/{responsavel}/g, responsavel || '')
    .replace(/{aluno}/g, aluno || '')
    .replace(/{faltas}/g, faltas != null ? String(faltas) : '');
}

function temFaltasConsecutivas(faltas, n) {
  if (faltas.length < n) return false;
  const datas = faltas
    .map(f => new Date(f.data).getTime())
    .sort((a, b) => a - b);

  let streak = 1;
  for (let i = 1; i < datas.length; i++) {
    const diffDias = (datas[i] - datas[i - 1]) / 86400000;
    if (diffDias <= 3) {
      streak++;
      if (streak >= n) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

function temFaltasMensais(faltas, n) {
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  return faltas.filter(f => new Date(f.data) >= limite).length >= n;
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
  const config = await getConfiguracoes();
  const limiarConsecutivas = parseInt(config.threshold_consecutivas) || 3;
  const limiarMensal = parseInt(config.threshold_mensal) || 5;
  const templateConsecutivas = config.template_consecutivas;
  const templateMensal = config.template_mensal;

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
    if (temFaltasConsecutivas(faltas, limiarConsecutivas)) tipos.push('consecutivas');
    if (temFaltasMensais(faltas, limiarMensal)) tipos.push('mensal');

    for (const tipo of tipos) {
      if (await alertaJaEnviado(aluno.id, tipo)) continue;

      const respResult = await pool.query(
        'SELECT nome, telefone FROM responsaveis WHERE aluno_id = $1',
        [aluno.id]
      );

      if (respResult.rows.length === 0) continue;

      for (const resp of respResult.rows) {
        const template = tipo === 'consecutivas' ? templateConsecutivas : templateMensal;
        const faltasCount = tipo === 'consecutivas' ? limiarConsecutivas : limiarMensal;
        const msg = substituir(template, { responsavel: resp.nome, aluno: aluno.nome, faltas: faltasCount });
        await sendMessage(resp.telefone, msg);
      }

      await registrarAlerta(aluno.id, tipo);
      enviados.push({ aluno: aluno.nome, tipo, responsaveis: respResult.rows.length });
    }
  }

  return enviados;
}

module.exports = { avaliarEEnviarAlertas };
