import { useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
}

export default function UploadForm({ onUpload, isLoading, error }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer text-blue-600 hover:text-blue-800"
        >
          {preview ? 'Выбрать другой файл' : 'Выберите скриншот из банковского приложения'}
        </label>
      </div>

      {preview && (
        <div className="space-y-4">
          <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
          <button
            onClick={handleUpload}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Распознавание...' : 'Распознать'}
          </button>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          Ошибка: {error}
        </div>
      )}
    </div>
  );
}
