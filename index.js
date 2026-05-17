const path = require('path');

const [,, comando, ...args] = process.argv;

switch (comando) {
  case 'importar': {
    const pdfFlag = args.indexOf('--pdf');
    if (pdfFlag === -1 || !args[pdfFlag + 1]) {
      console.error('Uso: node index.js importar --pdf <caminho-do-pdf>');
      process.exit(1);
    }
    const pdfPath = path.resolve(args[pdfFlag + 1]);
    const { importarPdf } = require('./src/importar');
    importarPdf(pdfPath)
      .then(result => {
        console.log(`\nImportação concluída:`);
        console.log(`  Disciplina     : ${result.disciplina}`);
        console.log(`  Ano letivo     : ${result.ano}`);
        console.log(`  Turma/Série    : ${result.meta.turma} — ${result.meta.serie}`);
        console.log(`  Aulas no PDF   : ${result.datasAula.length}`);
        console.log(`  Alunos         : ${result.totalAlunos} (${result.novosAlunos} novos)`);
        console.log(`  Faltas salvas  : ${result.novasFaltas}`);
      })
      .catch(err => {
        console.error('Erro ao importar PDF:', err.message);
        process.exit(1);
      });
    break;
  }

  default:
    console.log('Comandos disponíveis:');
    console.log('  node index.js importar --pdf <caminho>   Importa relatório de faltas em PDF');
    break;
}
