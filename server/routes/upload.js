const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importarPdf } = require('../../src/importar');

const isPackaged = typeof process.pkg !== 'undefined';
const baseDir = isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname, '../../');
const uploadDir = path.join(baseDir, 'data/uploads');

// Ensure upload directory exists physically
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const originalName = req.file.originalname.replace(/\.pdf$/i, '');
  const destPath = path.join(req.file.destination, `${originalName}.pdf`);

  try {
    fs.renameSync(req.file.path, destPath);
    const result = await importarPdf(destPath);
    fs.unlink(destPath, () => {}); // fire-and-forget, ignore errors
    res.json(result);
  } catch (err) {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    else if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(422).json({ error: err.message });
  }
});

module.exports = router;
