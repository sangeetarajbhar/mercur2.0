"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.uploadToS3WithPath = uploadToS3WithPath;
exports.constructS3Url = constructS3Url;
exports.extractRelativePath = extractRelativePath;
exports.batchUploadToS3 = batchUploadToS3;
exports.batchUploadToS3Stream = batchUploadToS3Stream;
exports.toPostgresFormat = toPostgresFormat;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
// Create persistent HTTP agents for connection pooling
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50, // Allow up to 50 concurrent connections
    maxFreeSockets: 10, // Keep 10 idle sockets open
    timeout: 60000, // 60 second timeout
    keepAliveMsecs: 1000, // Send keep-alive probes every 1 second
});
const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 1000,
});
// Create a singleton S3 client with optimized settings and connection pooling
exports.s3Client = new client_s3_1.S3Client({
    region: process.env.S3_REGION,
    ...(process.env.NODE_ENV !== 'production' && {
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
    }),
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    maxAttempts: 3, // Reduce retry attempts for faster failures
    requestHandler: {
        httpsAgent, // Use persistent HTTPS agent
        httpAgent, // Use persistent HTTP agent (for local/non-SSL endpoints)
        connectionTimeout: 30000, // 30 second connection timeout
        socketTimeout: 30000, // 30 second socket timeout
    },
});
// Custom S3 upload function with full path support
async function uploadToS3WithPath(filename, content, mimeType) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        Body: content,
        ContentType: mimeType || 'application/octet-stream',
        ...(mimeType && mimeType.startsWith('image/') && {
            Metadata: {
                'processed': 'true',
                'upload-time': new Date().toISOString()
            }
        })
    });
    await exports.s3Client.send(command);
    // Return the public URL
    if (process.env.S3_FILE_URL) {
        const baseUrl = process.env.S3_FILE_URL.endsWith('/')
            ? process.env.S3_FILE_URL.slice(0, -1)
            : process.env.S3_FILE_URL;
        return `${baseUrl}/${filename}`;
    }
    return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`;
}
// Helper function to construct full S3 URL from relative path
function constructS3Url(relativePath) {
    if (!relativePath)
        return '';
    // If it's already a full URL, return as is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }
    // Construct full URL from relative path
    if (process.env.S3_FILE_URL) {
        const baseUrl = process.env.S3_FILE_URL.endsWith('/')
            ? process.env.S3_FILE_URL.slice(0, -1)
            : process.env.S3_FILE_URL;
        return `${baseUrl}/${relativePath}`;
    }
    return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${relativePath}`;
}
// Helper function to extract relative path from full S3 URL
function extractRelativePath(fullUrl) {
    if (!fullUrl)
        return '';
    // If it's already a relative path, return as is
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        return fullUrl;
    }
    // Extract everything after the domain name
    const match = fullUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (match && match[1]) {
        return match[1]; // Return everything after the domain
    }
    return fullUrl; // Return original if no match (shouldn't happen)
}
// Batch upload function for multiple files - returns relative paths only
async function batchUploadToS3(uploads) {
    const uploadPromises = uploads.map(({ filename, content, mimeType }) => uploadToS3WithPath(filename, content, mimeType));
    // Upload all files in parallel
    const results = await Promise.allSettled(uploadPromises);
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return extractRelativePath(result.value);
        }
        else {
            throw new Error(`Upload failed for ${uploads[index].filename}`);
        }
    });
}
/**
 * Streaming S3 upload for memory-efficient processing
 */
async function batchUploadToS3Stream(uploads) {
    // Configurable upload timeout (default 60s)
    const UPLOAD_TIMEOUT = parseInt(process.env.S3_UPLOAD_TIMEOUT || "60000", 10);
    const MAX_RETRIES = 2;
    // Limit concurrency to avoid memory pressure
    const MAX_CONCURRENT_UPLOADS = 5;
    const results = [];
    // Simple queue-based concurrency limiter
    const queue = [...uploads];
    const active = [];
    const runUpload = async (uploadItem) => {
        const { filename, stream, mimeType } = uploadItem;
        let attempt = 0;
        while (attempt <= MAX_RETRIES) {
            try {
                attempt++;
                const uploadPromise = new lib_storage_1.Upload({
                    client: exports.s3Client,
                    params: {
                        Bucket: process.env.S3_BUCKET,
                        Key: filename,
                        Body: stream,
                        ContentType: mimeType,
                        Metadata: {
                            processed: "true",
                            "upload-time": new Date().toISOString(),
                        },
                    },
                    partSize: 5 * 1024 * 1024,
                    queueSize: 1,
                }).done();
                // Handle stream errors
                stream.on('error', () => {
                    // Stream error will be caught in the catch block below
                });
                // Timeout protection
                await Promise.race([
                    uploadPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`S3 upload timeout for ${filename} (>${UPLOAD_TIMEOUT}ms)`)), UPLOAD_TIMEOUT)),
                ]);
                return filename;
            }
            catch (error) {
                const errorMessage = error?.message || String(error);
                if (attempt > MAX_RETRIES) {
                    throw new Error(`Failed to upload ${filename} to S3 after ${MAX_RETRIES} retries: ${errorMessage}`);
                }
                // Wait a bit before retry
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
        throw new Error(`Failed to upload ${filename}`);
    };
    // Run with concurrency control - collect all promises
    const allUploadPromises = [];
    while (queue.length > 0 || active.length > 0) {
        // Start new uploads up to concurrency limit
        while (queue.length > 0 && active.length < MAX_CONCURRENT_UPLOADS) {
            const uploadItem = queue.shift();
            const p = runUpload(uploadItem);
            active.push(p);
            allUploadPromises.push(p);
        }
        if (active.length > 0) {
            // Wait for at least one upload to complete
            const completedIndex = await Promise.race(active.map((p, i) => p.then(() => i).catch(() => i)));
            // Remove completed promise from active array
            const completedPromise = active[completedIndex];
            active.splice(completedIndex, 1);
            // Check if it succeeded (if it failed, error will be caught in final check)
            try {
                const value = await completedPromise;
                results.push(value);
            }
            catch {
                // Error already logged in runUpload, will be caught in final check
            }
        }
    }
    // Wait for all uploads to complete and check for failures
    const allResults = await Promise.allSettled(allUploadPromises);
    const errors = [];
    allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            if (!results.includes(result.value)) {
                results.push(result.value);
            }
        }
        else {
            const uploadItem = uploads[index];
            errors.push({
                filename: uploadItem.filename,
                error: result.reason?.message || String(result.reason)
            });
        }
    });
    // If any uploads failed, throw an error
    if (errors.length > 0) {
        const errorMessages = errors.map(e => `${e.filename}: ${e.error}`).join('; ');
        throw new Error(`Failed to upload ${errors.length} file(s) to S3: ${errorMessages}`);
    }
    // Verify all uploads succeeded
    if (results.length !== uploads.length) {
        throw new Error(`Upload mismatch: expected ${uploads.length} uploads, but only ${results.length} succeeded`);
    }
    return results;
}
/**
 * Convert Date to PostgreSQL timestamp format used by Medusa
 * Format: "YYYY-MM-DD HH:MM:SS.ssssss +00:00" (with microseconds)
 * @param date - The date to format
 * @returns Medusa-compatible PostgreSQL timestamp string
 */
function toPostgresFormat(date) {
    // Convert to ISO string and transform to Medusa's expected format
    const isoString = date.toISOString();
    // Replace 'T' with space, add microseconds (000), and format timezone with space
    return isoString
        .replace('T', ' ') // Replace T with space
        .replace('Z', '000 +00:00'); // Add microseconds and space before timezone
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3NoYXJlZC91dGlscy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMkNBLGdEQTRCQztBQUdELHdDQWdCQztBQUdELGtEQWNDO0FBR0QsMENBaUJDO0FBS0Qsc0RBc0pDO0FBUUQsNENBUUM7QUExU0Qsa0RBQThEO0FBQzlELHNEQUE4QztBQUU5Qyw2Q0FBK0I7QUFDL0IsMkNBQTZCO0FBRTdCLHVEQUF1RDtBQUN2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDakMsU0FBUyxFQUFFLElBQUk7SUFDZixVQUFVLEVBQUUsRUFBRSxFQUFFLHdDQUF3QztJQUN4RCxjQUFjLEVBQUUsRUFBRSxFQUFFLDRCQUE0QjtJQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQjtJQUNwQyxjQUFjLEVBQUUsSUFBSSxFQUFFLHdDQUF3QztDQUMvRCxDQUFDLENBQUM7QUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDL0IsU0FBUyxFQUFFLElBQUk7SUFDZixVQUFVLEVBQUUsRUFBRTtJQUNkLGNBQWMsRUFBRSxFQUFFO0lBQ2xCLE9BQU8sRUFBRSxLQUFLO0lBQ2QsY0FBYyxFQUFFLElBQUk7Q0FDckIsQ0FBQyxDQUFDO0FBRUgsOEVBQThFO0FBQ2pFLFFBQUEsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQztJQUNuQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTO0lBQzdCLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLElBQUk7UUFDM0MsV0FBVyxFQUFFO1lBQ1gsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWlCO1lBQzFDLGVBQWUsRUFBRSxPQUFP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