const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const FileType = require('file-type');

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campus-market',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

// Create multer upload instance with memory storage for validation
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: async (req, file, cb) => {
    try {
      // Check file type by actual content (magic bytes)
      const fileType = await FileType.fromBuffer(file.buffer);

      if (!fileType) {
        return cb(new Error('Invalid file type. Could not determine file type.'), false);
      }

      // Allow only image formats
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ];

      if (!allowedMimes.includes(fileType.mime)) {
        return cb(new Error(`File type ${fileType.mime} is not allowed. Only images are permitted.`), false);
      }

      // Verify the mimetype matches the actual content
      if (!fileType.mime.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }

      cb(null, true);
    } catch (error) {
      cb(new Error('Error validating file type'), false);
    }
  }
});

// Single image upload
const uploadSingle = upload.single('image');

// Multiple images upload (max 5)
const uploadMultiple = upload.array('images', 5);

// Handle upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 images'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  handleUploadError
};
