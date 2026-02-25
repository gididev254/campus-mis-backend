const cloudinary = require('cloudinary').v2;
const ErrorResponse = require('../middleware/error').ErrorResponse;
const logger = require('../utils/logger');

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * @desc    Upload a single image to Cloudinary
 * @route   POST /api/upload/image
 * @access  Private
 * @param   {Object} req.file - Uploaded file object from Multer
 * @returns {Promise<Object>} Response with success status and image data (url, publicId, width, height)
 * @throws  {400} If no file uploaded or file size exceeds 5MB
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      logger.fileUpload({
        userId: req.user?.id,
        success: false,
        reason: 'No file uploaded'
      });
      return next(new ErrorResponse('No file uploaded', 400));
    }

    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      logger.fileUpload({
        userId: req.user?.id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        success: false,
        reason: 'File size exceeds 5MB'
      });
      return next(new ErrorResponse('File size too large. Max 5MB', 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'campus-market',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 5000000, // 5MB
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, crop: 'limit' }
      ]
    });

    logger.fileUpload({
      userId: req.user?.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadType: 'image',
      success: true
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(new ErrorResponse('Failed to upload image', 500));
  }
};

/**
 * @desc    Upload multiple images to Cloudinary (max 5)
 * @route   POST /api/upload/images
 * @access  Private
 * @param   {Array<Object>} req.files - Array of uploaded file objects from Multer
 * @returns {Promise<Object>} Response with success status and array of image data (url, publicId, width, height)
 * @throws  {400} If no files uploaded, more than 5 files, or any file exceeds 5MB
 */
exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('No files uploaded', 400));
    }

    if (req.files.length > 5) {
      return next(new ErrorResponse('Maximum 5 images allowed', 400));
    }

    const uploads = [];

    for (const file of req.files) {
      // Check file size
      if (file.size > 5 * 1024 * 1024) {
        return next(new ErrorResponse(`File ${file.originalname} too large. Max 5MB`, 400));
      }

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'campus-market',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 5000000,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, crop: 'limit' }
        ]
      });

      uploads.push({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      });
    }

    res.json({
      success: true,
      data: uploads
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(new ErrorResponse('Failed to upload images', 500));
  }
};

/**
 * @desc    Delete an image from Cloudinary
 * @route   DELETE /api/upload/image/:publicId
 * @access  Private
 * @param   {string} req.params.publicId - Cloudinary public ID of image to delete
 * @returns {Promise<Object>} Response with success status and message
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    next(new ErrorResponse('Failed to delete image', 500));
  }
};

module.exports = exports;
