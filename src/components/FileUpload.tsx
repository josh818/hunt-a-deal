import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileIcon } from "lucide-react";
import { validateFile, validateImageFile, type FileValidationOptions } from "@/utils/fileValidation";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  label?: string;
  accept?: string;
  validationOptions?: FileValidationOptions;
  validateImage?: boolean;
  currentFile?: File | null;
  disabled?: boolean;
  className?: string;
}

export const FileUpload = ({
  onFileSelect,
  onFileRemove,
  label = "Upload File",
  accept = "image/*",
  validationOptions,
  validateImage = false,
  currentFile,
  disabled = false,
  className = "",
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);

    // Basic validation
    const basicValidation = validateFile(file, validationOptions);
    if (!basicValidation.valid) {
      toast.error(basicValidation.error || "Invalid file");
      setIsValidating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Image-specific validation if requested
    if (validateImage && file.type.startsWith('image/')) {
      const imageValidation = await validateImageFile(file);
      if (!imageValidation.valid) {
        toast.error(imageValidation.error || "Invalid image file");
        setIsValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
    }

    setIsValidating(false);
    onFileSelect(file);
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileRemove?.();
  };

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2 space-y-2">
        {!currentFile ? (
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={disabled || isValidating}
              className="cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isValidating}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
            <div className="flex items-center gap-2">
              <FileIcon className="h-4 w-4" />
              <span className="text-sm">{currentFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(currentFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isValidating && (
          <p className="text-xs text-muted-foreground">Validating file...</p>
        )}
      </div>
    </div>
  );
};
