import sharp from 'sharp';
import { batchUploadToS3, constructS3Url } from './common';
// import path from 'path';
import crypto from 'crypto';

// In-memory cache for processed images (consider Redis for production)
const imageCache = new Map<string, ResizedImage[]>();

// Helper to generate a hash for the image content
function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
}

export interface ImageSize {
  width: number;
  height: number;
  suffix: string;
}

export interface ResizedImage {
  url: string;
  width: number;
  height: number;
  size: string;
}

/**
 * Standard image sizes for product images based on requirements
 */
export const PRODUCT_IMAGE_SIZES: ImageSize[] = [
  { width: 80, height: 107, suffix: '80x107' },
  { width: 160, height: 213, suffix: '160x213' },
  { width: 256, height: 341, suffix: '256x341' },
  { width: 512, height: 683, suffix: '512x683' },
  { width: 800, height: 1067, suffix: '800x1067' },
  { width: 960, height: 1280, suffix: '960x1280' },
  { width: 0, height: 0, suffix: 'original' } // Original size - keep as uploaded
];



/**
 * Processes and resizes an image to multiple dimensions and uploads to S3
 * 
 * @param imageBuffer - The original image buffer
 * @param productId - Product ID/Style ID for folder structure
 * @param productName - Product name for filename
 * @param sizes - Array of sizes to generate
 * @returns Array of URLs for the resized images
 */
export async function processAndUploadImage(
  imageBuffer: Buffer,
  productId: string,
  productName: string,
  sizes: ImageSize[] = PRODUCT_IMAGE_SIZES
): Promise<ResizedImage[]> {
  try {
    // Check cache first using image hash
    const imageHash = generateImageHash(imageBuffer);
    const cacheKey = `${imageHash}_${JSON.stringify(sizes)}`;
    
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey)!;
    }
    
    // Get original image metadata for dimensions
    const originalMetadata = await sharp(imageBuffer).metadata();
    
    // Generate a UUID for the image
    const uuid = generateUUID();
    
    // Sanitize product name for filename
    const sanitizedName = productName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Base filename without extension
    const baseFilename = `${uuid}${sanitizedName}`;
    
    // Output format
    const outputFormat = 'webp';
    const mimeType = 'image/webp';
    
    const resizedImages: ResizedImage[] = [];
    
    // Process all sizes in parallel - image processing and upload preparation
    const resizePromises = sizes.map(async (size) => {
      try {
        let resizedBuffer: Buffer;
        
        if (size.suffix === 'original') {
          // For original size, keep the image as uploaded without resizing
          resizedBuffer = await sharp(imageBuffer)
            .webp({ 
              quality: 100, // Good balance between quality and file size
              effort: 2, // Faster processing (1-6, lower = faster)
              nearLossless: false, // Disable for better performance
              smartSubsample: true, // Better compression
              preset: 'photo', // Optimize for photos
            })
            .toBuffer();
        } else {
          // Create a resized version with optimized settings
          resizedBuffer = await sharp(imageBuffer)
            .resize({
              width: size.width,
              height: size.height,
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
              kernel: sharp.kernel.lanczos3, // Fast, good quality resampling
              fastShrinkOnLoad: true, // Enable fast shrinking during load
            })
            .webp({ 
              quality: 85, // Good balance between quality and file size
              effort: 2, // Faster processing (1-6, lower = faster)
              nearLossless: false, // Disable for better performance
              smartSubsample: true, // Better compression
              preset: 'photo', // Optimize for photos
            })
            .toBuffer();
        }
        
        // Generate path based on required structure
        // For original size, don't include size folder
        const filePath = size.suffix === 'original'
          ? `images/product/${productId}/${baseFilename}.${outputFormat}`
          : `images/product/${productId}/${size.suffix}/${baseFilename}.${outputFormat}`;
        
        return {
          buffer: resizedBuffer,
          filePath,
          size,
        };
      } catch (error) {
        console.error(`Error processing size ${size.suffix}:`, error);
        return null;
      }
    });
    
    // Wait for all image processing to complete
    const processResults = await Promise.allSettled(resizePromises);
    
    // Prepare batch upload data
    const uploadsToProcess: Array<{ filename: string; content: Buffer; mimeType: string }> = [];
    const sizeMetadata: Array<{ size: ImageSize; filePath: string }> = [];
    
    processResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const { buffer, filePath, size } = result.value;
        uploadsToProcess.push({
          filename: filePath,
          content: buffer,
          mimeType,
        });
        sizeMetadata.push({ size, filePath });
      } else {
        console.error(`Failed to process size ${sizes[index].suffix}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });
    
    // Batch upload all processed images at once
    if (uploadsToProcess.length > 0) {
      const uploadUrls = await batchUploadToS3(uploadsToProcess);
      
      // Map results back to the expected format
      // Note: batchUploadToS3 now returns relative paths directly
      uploadUrls.forEach((relativePath, index) => {
        const { size } = sizeMetadata[index];
        
        // For original images, use the actual dimensions from metadata
        if (size.suffix === 'original') {
          resizedImages.push({
            url: relativePath, // This is now a relative path from batchUploadToS3
            width: originalMetadata.width || 0,
            height: originalMetadata.height || 0,
            size: size.suffix
          });
        } else {
          resizedImages.push({
            url: relativePath, // This is now a relative path from batchUploadToS3
            width: size.width,
            height: size.height,
            size: size.suffix
          });
        }
      });
    }
    
    // Cache the results for future use
    imageCache.set(cacheKey, resizedImages);
    
    // Clear cache if it gets too large (prevent memory leaks)
    if (imageCache.size > 1000) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }
    
    return resizedImages;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Process a URL image by downloading it first, then resizing and uploading
 * 
 * @param imageUrl - URL of the image to process
 * @param productId - Product ID/Style ID for folder structure
 * @param productName - Product name for filename
 * @param imageType - Type of image (front, back, etc.)
 * @returns Array of URLs for the resized images
 */
export async function processImageFromUrl(
  imageUrl: string,
  productId: string,
  productName: string
): Promise<ResizedImage[]> {
  try {
    if (!imageUrl) return [];
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download image from ${imageUrl}: ${response.statusText}`);
      return [];
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Process and upload the image
    return await processAndUploadImage(imageBuffer, productId, productName);
  } catch (error) {
    console.error(`Error processing image from URL ${imageUrl}:`, error);
    return [];
  }
}
