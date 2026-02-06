import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

interface Props {
  onUpload: (file: File) => void;
  onUploadMultiple?: (files: File[]) => void;
  isLoading: boolean;
  error?: string | null;
}

export interface UploadFormRef {
  clearFiles: () => void;
}

const UploadForm = forwardRef<UploadFormRef, Props>(({ onUpload, onUploadMultiple, isLoading, error }, ref) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const filesRef = useRef<FileWithPreview[]>([]);

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    const newFileObjects: FileWithPreview[] = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setFiles(prev => [...prev, ...newFileObjects]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const toRemove = prev.find(f => f.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearFiles = useCallback(() => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
  }, [files]);

  useImperativeHandle(ref, () => ({
    clearFiles,
  }), [clearFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        addFiles(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  useEffect(() => {
    return () => {
      // Use ref to get current files on unmount
      filesRef.current.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const handleUpload = () => {
    if (files.length === 1) {
      onUpload(files[0].file);
    } else if (files.length > 1 && onUploadMultiple) {
      onUploadMultiple(files.map(f => f.file));
    }
  };

  return (
    <div className="card p-4 sm:p-6 space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
          isDragging ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20' : 'border-gray-300 dark:border-dark-50/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />
        <div className="space-y-2">
          <label
            htmlFor="file-input"
            className="cursor-pointer text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 block"
          >
            Выберите скриншоты из банковского приложения
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Или перетащите файлы сюда, или вставьте из буфера (Ctrl+V)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f) => (
              <div key={f.id} className="relative group">
                <img
                  src={f.preview}
                  alt="Preview"
                  className="w-full h-24 object-cover rounded border border-gray-300 dark:border-dark-50/30"
                />
                <button
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-300">
              {files.length} {files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}
            </span>
            <button
              onClick={handleUpload}
              disabled={isLoading || files.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Распознавание...' : 'Распознать'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          Ошибка: {error}
        </div>
      )}
    </div>
  );
});

UploadForm.displayName = 'UploadForm';

export default UploadForm;
