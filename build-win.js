const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function build() {
  console.log('======================================================');
  console.log('  Iniciando Empacotamento do Faltas Bot para Windows  ');
  console.log('======================================================\n');

  const rootDir = __dirname;
  const distDir = path.join(rootDir, 'dist-win');

  // 1. Limpar e criar diretório final
  console.log('1. Preparando pasta de distribuição (dist-win/)...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 2. Compilar o Frontend React (Vite)
  console.log('\n2. Compilando o frontend React...');
  execSync('npm run build', {
    cwd: path.join(rootDir, 'client'),
    stdio: 'inherit'
  });
  console.log('✔ Frontend compilado com sucesso.');

  // 3. Baixar o binário SQLite3 compilado para Windows x64
  console.log('\n3. Baixando módulo SQLite3 nativo para Windows x64...');
  const sqliteDir = path.join(rootDir, 'node_modules/sqlite3');
  try {
    execSync(
      'npx prebuild-install --platform=win32 --arch=x64 --runtime=napi --verbose',
      { cwd: sqliteDir, stdio: 'inherit' }
    );
    console.log('✔ Módulo SQLite3 para Windows baixado com sucesso.');
  } catch (err) {
    console.error('❌ Falha ao obter binário do SQLite3 para Windows:', err.message);
    process.exit(1);
  }

  // 4. Copiar os arquivos binários do SQLite3 para a pasta de distribuição
  console.log('\n4. Copiando binários do SQLite3 para a distribuição...');
  const sqliteBindingSource = path.join(
    sqliteDir,
    'build/Release/node_sqlite3.node'
  );

  if (!fs.existsSync(sqliteBindingSource)) {
    console.error(`❌ Erro: Arquivo do SQLite3 não encontrado em: ${sqliteBindingSource}`);
    process.exit(1);
  }

  // Cria as estruturas que o pkg/sqlite3 esperam para resolver o módulo
  
  // Estrutura 1: build/Release/node_sqlite3.node
  const path1 = path.join(distDir, 'node_modules/sqlite3/build/Release');
  fs.mkdirSync(path1, { recursive: true });
  fs.copyFileSync(sqliteBindingSource, path.join(path1, 'node_sqlite3.node'));

  // Estrutura 2: napi-v3-win32-x64
  const path2 = path.join(distDir, 'node_modules/sqlite3/lib/binding/napi-v3-win32-x64');
  fs.mkdirSync(path2, { recursive: true });
  fs.copyFileSync(sqliteBindingSource, path.join(path2, 'node_sqlite3.node'));

  // Estrutura 3: raiz da pasta de distribuição
  fs.copyFileSync(sqliteBindingSource, path.join(distDir, 'node_sqlite3.node'));
  
  console.log('✔ Binários do SQLite3 copiados para todas as estruturas de destino.');

  // Restaura o binário nativo do Linux para não quebrar a execução local do desenvolvedor!
  console.log('\nRestaurando binário nativo local do Linux...');
  try {
    execSync(
      'npx prebuild-install --verbose',
      { cwd: sqliteDir, stdio: 'ignore' }
    );
    console.log('✔ Binário nativo do Linux restaurado.');
  } catch (err) {
    console.log('⚠ Não foi possível restaurar o binário Linux automaticamente. Rode "npm install" se necessário.');
  }

  // 5. Compilar o executável com o Vercel Pkg
  console.log('\n5. Compilando o executável final com o PKG...');
  // Compila usando as configurações do package.json (incluindo assets e bin)
  execSync(
    'npx pkg . --targets node18-win-x64 --output dist-win/faltas-bot.exe',
    { cwd: rootDir, stdio: 'inherit' }
  );
  console.log('✔ Executável gerado com sucesso em: dist-win/faltas-bot.exe');

  // 6. Copiar arquivos de configuração e ajuda
  console.log('\n6. Copiando arquivos adicionais de configuração e instruções...');
  
  // Criar um arquivo .env padrão limpo para o usuário final
  const envContent = `PORT=3001
# Caso precise restringir o acesso, descomente a linha abaixo e defina sua chave secreta
# API_KEY=sua_chave_secreta_aqui
`;
  fs.writeFileSync(path.join(distDir, '.env'), envContent);

  // Criar um arquivo LEIA-ME com instruções simples em Português
  const readmeContent = `========================================================================
             COMO UTILIZAR O FALTAS BOT (PORTÁTIL WINDOWS)
========================================================================

Este é o executável portátil do monitor de faltas escolares. Você pode rodar 
este sistema em qualquer computador Windows apenas seguindo os passos abaixo:

COMO INICIAR:
------------------------------------------------------------------------
1. Certifique-se de que você tem o Google Chrome ou o Microsoft Edge instalados no PC.
2. Dê dois cliques no arquivo "faltas-bot.exe".
3. Uma janela preta do terminal irá se abrir. Mantenha essa janela aberta!
4. Abra o seu navegador de internet (Chrome, Edge ou outro) e acesse o endereço:
   http://localhost:3001
5. Siga as instruções na tela do navegador para escanear o QR Code do WhatsApp.

MAIS INFORMAÇÕES E BACKUPS:
------------------------------------------------------------------------
- Banco de Dados: O sistema salvará todas as informações dos alunos no arquivo
  "faltas-bot.db" localizado nesta mesma pasta. Para fazer backup, basta copiar
  este único arquivo!
- Sessão do WhatsApp: A sessão do robô é salva na pasta ".wwebjs_auth" nesta 
  mesma pasta. Não exclua essa pasta a menos que queira desconectar a conta.

Dica: Você pode criar um atalho do arquivo "faltas-bot.exe" na sua Área de Trabalho!
`;
  fs.writeFileSync(path.join(distDir, 'LEIA-ME.txt'), readmeContent);
  console.log('✔ Arquivos de configuração e LEIA-ME criados.');

  // 7. Compactar em arquivo ZIP para distribuição
  console.log('\n7. Criando pacote compactado ZIP...');
  try {
    // Roda o comando zip nativo no Linux (uma vez que o agente está rodando em Linux)
    execSync('zip -r ../faltas-bot-windows.zip .', {
      cwd: distDir,
      stdio: 'inherit'
    });
    console.log('\n✔✔✔ SUCESSO! Pacote gerado com sucesso em: faltas-bot-windows.zip ✔✔✔');
  } catch (err) {
    console.log('⚠ Não foi possível gerar o ZIP automaticamente (comando "zip" indisponível).');
    console.log('Os arquivos estão prontos para envio dentro da pasta: dist-win/');
  }
}

build().catch(err => {
  console.error('\n❌ Erro durante o processo de build:', err);
  process.exit(1);
});
