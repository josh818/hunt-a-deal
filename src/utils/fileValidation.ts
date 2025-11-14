/**
 * File upload validation utilities
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

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Validates a file based on size and type constraints
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
      error: `File size must be less than ${maxSizeInMB}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file extension
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
 */
export const validateImageFile = async (file: File): Promise<FileValidationResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      if (!e.target?.result) {
        resolve({ valid: false, error: 'Failed to read file' });
        return;
      }

      img.onload = () => {
        // Additional checks can be added here (e.g., min/max dimensions)
        resolve({ valid: true });
      };

      img.onerror = () => {
        resolve({ valid: false, error: 'Invalid or corrupted image file' });
      };

      img.src = e.target.result as string;
    };

    reader.onerror = () => {
      resolve({ valid: false, error: 'Failed to read file' });
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Sanitizes a filename by removing potentially dangerous characters
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
