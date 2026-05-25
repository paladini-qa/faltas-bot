const router = require('express').Router();
const { 
  getAlunoStatsParaMensagem, 
  getResponsaveisPorAluno, 
  getResponsaveisETurmaStats, 
  registrarAlerta 
} = require('../../src/db');
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
      const aluno = await getAlunoStatsParaMensagem(alunoId);
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

      const responsaveisRaw = await getResponsaveisPorAluno(alunoId);
      const responsaveis = telefonesSelecionados
        ? responsaveisRaw.filter(r => telefonesSelecionados.includes(r.telefone))
        : responsaveisRaw;

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
        await registrarAlerta(alunoId, 'manual');
      }

    } else if (turma) {
      // Turma mode
      const rows = await getResponsaveisETurmaStats(turma);

      const alunosRegistrados = new Set();
      for (const row of rows) {
        const msg = substituir(mensagemTemplate, {
          responsavel: row.resp_nome,
          aluno: row.aluno_nome,
          faltas: row.faltas_injustificadas,
        });
        try {
          await sendMessage(row.resp_telefone, msg);
          enviados.push(row.resp_telefone);
          if (!alunosRegistrados.has(row.aluno_id)) {
            await registrarAlerta(row.aluno_id, 'manual');
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
