require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('../src/db');
const { createClient } = require('../src/whatsapp');
const auth = require('./middleware/auth');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
}));
app.use(express.json());
app.use(auth); // applies to all routes below

// produção: serve o build estático do React
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alunos', require('./routes/alunos'));
app.use('/api/responsaveis', require('./routes/responsaveis'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/faltas', require('./routes/faltas'));
app.use('/api/alertas', require('./routes/alertas'));
app.use('/api/configuracoes', require('./routes/configuracoes'));
app.use('/api/mensagens', require('./routes/mensagens'));

// produção: fallback para o index.html do React (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    createClient();
  })
  .catch(err => { console.error('Failed to init schema:', err); process.exit(1); });
