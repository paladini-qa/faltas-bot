require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { initSchema } = require('../src/db');
const { createClient } = require('../src/whatsapp');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alunos', require('./routes/alunos'));
app.use('/api/responsaveis', require('./routes/responsaveis'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/alertas', require('./routes/alertas'));

const PORT = process.env.PORT || 3001;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    createClient();
  })
  .catch(err => { console.error('Failed to init schema:', err); process.exit(1); });
