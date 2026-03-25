const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Opprett uploads-mappe hvis den ikke finnes
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const avvikDir = path.join(uploadsDir, 'avvik');
if (!fs.existsSync(avvikDir)) {
  fs.mkdirSync(avvikDir, { recursive: true });
}

// Konfigurer multer for bildeopplasting
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avvikDir);
  },
  filename: (req, file, cb) => {
    // Generer unikt filnavn med timestamp og originalt navn
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avvik-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Tillat kun bilder
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Kun bilder er tillatt!'), false);
    }
  }
});

// Upload bilde for avvik (enkelt bilde)
router.post('/avvik', authenticateToken, upload.single('image'), (req, res) => {
  try {
    logger.log('Upload request received:', {
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      } : null,
      userAgent: req.headers['user-agent']
    });

    if (!req.file) {
      logger.log('No file uploaded');
      return res.status(400).json({ feil: 'Ingen fil ble lastet opp' });
    }

    // Returner relative URL som vil bli rewritet av frontend
    const fileUrl = `/uploads/avvik/${req.file.filename}`;
    
    logger.log('File uploaded successfully:', fileUrl);
    
    res.json({
      melding: 'Bilde lastet opp!',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    handleError(error, req, res, 'Upload image endpoint');
  }
});

// Upload flere bilder for avvik
router.post('/avvik/multiple', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    logger.log('Multiple upload request received:', {
      fileCount: req.files ? req.files.length : 0,
      files: req.files ? req.files.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        filename: f.filename
      })) : [],
      userAgent: req.headers['user-agent']
    });

    if (!req.files || req.files.length === 0) {
      logger.log('No files uploaded');
      return res.status(400).json({ feil: 'Ingen filer ble lastet opp' });
    }

    // Returner relative URLs som vil bli rewritet av frontend
    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/avvik/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size
    }));
    
    logger.log('Files uploaded successfully:', uploadedFiles.length);
    
    res.json({
      melding: `${uploadedFiles.length} bilder lastet opp!`,
      files: uploadedFiles
    });
  } catch (error) {
    handleError(error, req, res, 'Upload multiple images endpoint');
  }
});

// Serve statiske filer fra uploads-mappen
router.use('/uploads', express.static(uploadsDir));

// Direkte rute for å serve avvik-bilder
router.get('/avvik/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(avvikDir, filename);
  
  // Sjekk om filen eksisterer
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ feil: 'Bilde ikke funnet' });
  }
});

module.exports = router;
