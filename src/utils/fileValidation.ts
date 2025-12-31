/**
 * File upload validation utilities with security-focused constraints
 */

export interface FileValidationOptions {
  maxSizeInMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Strict defaults for logo uploads - no SVG to prevent XSS attacks
const DEFAULT_MAX_SIZE_MB = 2;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Logo-specific validation options (more restrictive)
export const LOGO_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeInMB: 2,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * Validates a file based on size and type constraints
 * Security: Validates both MIME type and extension to prevent bypass attacks
 */
export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult => {
  const {
    maxSizeInMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  } = options;

  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeInMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  // Check file size is not zero (empty file)
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File appears to be empty. Please select a valid file.',
    };
  }

  // Check file type (MIME type)
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: PNG, JPEG, WebP only.`,
    };
  }

  // Check file extension (defense in depth - attackers might spoof MIME type)
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File extension is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
};

/**
 * Validates multiple files
 */
export const validateFiles = (
  files: FileList | File[],
  options: FileValidationOptions = {}
): FileValidationResult => {
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const result = validateFile(file, options);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
};

/**
 * Validates an image file by attempting to load it
 * This ensures the file is actually a valid image and not a disguised malicious file
 */
export const validateImageFile = async (file: File): Promise<FileValidationResult> => {
  return new Promise((resolve) => {
    // First, validate basic file properties
    const basicValidation = validateFile(file, LOGO_VALIDATION_OPTIONS);
    if (!basicValidation.valid) {
      resolve(basicValidation);
      return;
    }

    const reader = new FileReader();
    const img = new Image();

    // Set timeout to prevent hanging on malformed files
    const timeout = setTimeout(() => {
      resolve({ valid: false, error: 'Image validation timed out. The file may be corrupted.' });
    }, 10000);

    reader.onload = (e) => {
      if (!e.target?.result) {
        clearTimeout(timeout);
        resolve({ valid: false, error: 'Failed to read file' });
        return;
      }

      img.onload = () => {
        clearTimeout(timeout);
        
        // Check for minimum dimensions (avoid tiny placeholder images)
        if (img.width < 50 || img.height < 50) {
          resolve({ valid: false, error: 'Image is too small. Minimum dimensions are 50x50 pixels.' });
          return;
        }

        // Check for maximum dimensions (prevent extremely large images)
        if (img.width > 4096 || img.height > 4096) {
          resolve({ valid: false, error: 'Image is too large. Maximum dimensions are 4096x4096 pixels.' });
          return;
        }

        resolve({ valid: true });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve({ valid: false, error: 'Invalid or corrupted image file. Please upload a valid PNG, JPEG, or WebP image.' });
      };

      img.src = e.target.result as string;
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      resolve({ valid: false, error: 'Failed to read file' });
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Sanitizes a filename by removing potentially dangerous characters
 * and generating a unique, unpredictable filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove or replace potentially dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove control characters and dangerous symbols
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^\.+/, '') // Remove leading dots
    .toLowerCase()
    .substring(0, 255); // Limit length
};

/**
 * Generates a secure, unpredictable filename for uploaded files
 * Uses UUID to prevent enumeration attacks
 */
export const generateSecureFilename = (originalFilename: string, prefix?: string): string => {
  const extension = getFileExtension(originalFilename);
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  
  if (prefix) {
    // Sanitize prefix to remove dangerous characters
    const safePrefix = prefix.replace(/[^a-z0-9-]/gi, '').substring(0, 50);
    return `${safePrefix}-${uuid}-${timestamp}${extension}`;
  }
  
  return `${uuid}-${timestamp}${extension}`;
};

/**
 * Extracts file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
};
