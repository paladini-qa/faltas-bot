const { 
  getConfiguracoes,
  alertaJaEnviado,
  registrarAlerta,
  getAlunosComFaltas,
  getResponsaveisPorAluno
} = require('./db');
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

async function previewAlertas() {
  const config = await getConfiguracoes();
  const limiarConsecutivas = parseInt(config.threshold_consecutivas) || 3;
  const limiarMensal = parseInt(config.threshold_mensal) || 5;

  const alunos = await getAlunosComFaltas();

  const pendentes = [];
  for (const aluno of alunos) {
    const faltas = aluno.faltas || [];
    const tipos = [];
    if (temFaltasConsecutivas(faltas, limiarConsecutivas)) tipos.push('consecutivas');
    if (temFaltasMensais(faltas, limiarMensal)) tipos.push('mensal');
    for (const tipo of tipos) {
      if (await alertaJaEnviado(aluno.id, tipo)) continue;
      const responsaveis = await getResponsaveisPorAluno(aluno.id);
      if (responsaveis.length === 0) continue;
      pendentes.push({ aluno: aluno.nome, tipo, responsaveis: responsaveis.length });
    }
  }
  return pendentes;
}

async function avaliarEEnviarAlertas() {
  const config = await getConfiguracoes();
  const limiarConsecutivas = parseInt(config.threshold_consecutivas) || 3;
  const limiarMensal = parseInt(config.threshold_mensal) || 5;
  const templateConsecutivas = config.template_consecutivas;
  const templateMensal = config.template_mensal;

  const alunos = await getAlunosComFaltas();

  const enviados = [];

  for (const aluno of alunos) {
    const faltas = aluno.faltas || [];
    const tipos = [];
    if (temFaltasConsecutivas(faltas, limiarConsecutivas)) tipos.push('consecutivas');
    if (temFaltasMensais(faltas, limiarMensal)) tipos.push('mensal');

    for (const tipo of tipos) {
      if (await alertaJaEnviado(aluno.id, tipo)) continue;

      const responsaveis = await getResponsaveisPorAluno(aluno.id);

      if (responsaveis.length === 0) continue;

      await registrarAlerta(aluno.id, tipo);

      for (const resp of responsaveis) {
        const template = tipo === 'consecutivas' ? templateConsecutivas : templateMensal;
        const faltasCount = tipo === 'consecutivas' ? limiarConsecutivas : limiarMensal;
        const msg = substituir(template, { responsavel: resp.nome, aluno: aluno.nome, faltas: faltasCount });
        await sendMessage(resp.telefone, msg);
      }
      enviados.push({ aluno: aluno.nome, tipo, responsaveis: responsaveis.length });
    }
  }

  return enviados;
}

module.exports = { avaliarEEnviarAlertas, previewAlertas };
