import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL?.split('@')[1],
  api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL?.split(':')[1]?.split('@')[0]?.split(':')[0],
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_URL?.split(':')[2]?.split('@')[0],
});

/**
 * Upload image to Cloudinary
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {string} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadImageToCloudinary(imageBase64, folder = 'angi-images') {
  try {
    // Upload base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBase64}`,
      {
        folder: folder,
        resource_type: 'image',
        overwrite: false,
        // Generate unique filename
        public_id: `recipe_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }
    );

    return result.secure_url; // Return HTTPS URL
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary: ' + error.message);
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Full URL or public_id of image
 * @returns {Promise<void>}
 */
export async function deleteImageFromCloudinary(imageUrl) {
  try {
    // Extract public_id from URL
    const publicId = imageUrl.split('/').pop().split('.')[0];
    const folder = imageUrl.includes(`/${process.env.CLOUDINARY_CLOUD_NAME}/`) 
      ? imageUrl.split(`/${process.env.CLOUDINARY_CLOUD_NAME}/`)[1].split('/')[0]
      : 'angi-images';
    
    const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
    
    await cloudinary.uploader.destroy(fullPublicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    // Don't throw - deletion is optional
  }
}

export default cloudinary;

