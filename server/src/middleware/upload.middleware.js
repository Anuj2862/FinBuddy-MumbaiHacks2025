const multer = require('multer');
const path = require('path');

/**
 * Multer middleware for handling Voice (audio) and OCR (images) uploads.
 * In a production environment, this would stream to S3 or Cloudinary.
 */

// Memory storage is better for ephemeral AI processing (streaming to agents)
// Disk storage for persistence if needed
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp', // OCR
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a' // Voice
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type for FinBuddy. Only images and audio allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;
