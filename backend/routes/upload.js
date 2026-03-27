const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Magic byte signatures for allowed image types
const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', ext: 'jpg',  bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  ext: 'png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif',  ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },           // GIF87a / GIF89a
  { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } }, // RIFF....WEBP
  { mime: 'image/bmp',  ext: 'bmp',  bytes: [0x42, 0x4D] },
];

// Validate file content matches an actual image via magic bytes
async function validateImageContent(filePath) {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    await fd.read(buf, 0, 12, 0);

    for (const sig of IMAGE_SIGNATURES) {
      if (sig.bytes.every((b, i) => buf[i] === b)) {
        if (sig.extra && !sig.extra.bytes.every((b, i) => buf[sig.extra.offset + i] === b)) {
          continue;
        }
        return { mime: sig.mime, ext: sig.ext };
      }
    }
    return null;
  } finally {
    await fd.close();
  }
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
    logger.debug('Upload request received', {
      hasFile: !!req.file,
      mimetype: req.file?.mimetype,
      size: req.file?.size
    });

    if (!req.file) {
      logger.debug('No file uploaded');
      return res.status(400).json({ feil: 'Ingen fil ble lastet opp' });
    }

    // Validate actual file content via magic bytes
    const type = await validateImageContent(req.file.path);
    if (!type) {
      safeUnlink(req.file.path);
      return res.status(400).json({ feil: 'Filen er ikke et gyldig bilde' });
    }

    const fileUrl = `/uploads/avvik/${req.file.filename}`;
    
    logger.info('File uploaded', { url: fileUrl });
    
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
    logger.debug('Multiple upload request received', {
      fileCount: req.files ? req.files.length : 0
    });

    if (!req.files || req.files.length === 0) {
      logger.debug('No files uploaded');
      return res.status(400).json({ feil: 'Ingen filer ble lastet opp' });
    }

    // Validate all files via magic bytes, reject invalid ones
    const uploadedFiles = [];
    for (const file of req.files) {
      const type = await validateImageContent(file.path);
      if (!type) {
        safeUnlink(file.path);
        logger.warn('Rejected invalid file', { filename: file.originalname });
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
    
    logger.info('Multiple files uploaded', { count: uploadedFiles.length });
    
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
