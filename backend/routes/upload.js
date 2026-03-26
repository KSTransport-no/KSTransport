const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileType = require('file-type');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
]);

// Validate file content matches an actual image via magic bytes
async function validateImageContent(filePath) {
  const type = await FileType.fromFile(filePath);
  if (!type || !ALLOWED_IMAGE_TYPES.has(type.mime)) {
    return null;
  }
  return type;
}

// Delete file helper (best-effort, log on failure)
function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Only allow safe alphanumeric extensions
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
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
router.post('/avvik', authenticateToken, upload.single('image'), async (req, res) => {
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

    // Validate actual file content via magic bytes
    const type = await validateImageContent(req.file.path);
    if (!type) {
      safeUnlink(req.file.path);
      return res.status(400).json({ feil: 'Filen er ikke et gyldig bilde' });
    }

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
router.post('/avvik/multiple', authenticateToken, upload.array('images', 10), async (req, res) => {
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

    // Validate all files via magic bytes, reject invalid ones
    const uploadedFiles = [];
    for (const file of req.files) {
      const type = await validateImageContent(file.path);
      if (!type) {
        safeUnlink(file.path);
        logger.log('Rejected invalid file:', file.originalname);
        continue;
      }
      uploadedFiles.push({
        url: `/uploads/avvik/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ feil: 'Ingen gyldige bilder ble lastet opp' });
    }
    
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
  const filename = path.basename(req.params.filename);
  const filePath = path.join(avvikDir, filename);
  
  // Prevent path traversal: resolved path must be inside avvikDir
  if (!filePath.startsWith(avvikDir)) {
    return res.status(400).json({ feil: 'Ugyldig filnavn' });
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ feil: 'Bilde ikke funnet' });
  }
});

module.exports = router;
