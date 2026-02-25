const express = require('express');
const router = express.Router();
const {
  uploadImage,
  uploadImages,
  deleteImage
} = require('../controllers/upload');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Single image upload
router.post('/image', protect, upload.single('image'), uploadImage);

// Multiple images upload (max 5)
router.post('/images', protect, upload.array('images', 5), uploadImages);

// Delete image
router.delete('/image/:publicId', protect, deleteImage);

module.exports = router;
