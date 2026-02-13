import { ChangeEvent, FormEvent } from "react";

interface UploadReceiptCardProps {
  uploading: boolean;
  bulkUploading: boolean;
  previewUrl: string;
  bulkFiles: File[];
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBulkSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBulkImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function UploadReceiptCard({
  uploading,
  bulkUploading,
  previewUrl,
  bulkFiles,
  error,
  onSubmit,
  onBulkSubmit,
  onImageChange,
  onBulkImageChange,
}: UploadReceiptCardProps) {
  return (
    <section className="card upload-card">
      <h2>Upload New Receipt</h2>
      <p className="subtitle">Your receipt is saved into this household session automatically.</p>
      <form onSubmit={onSubmit} className="form">
        <label htmlFor="receipt-image" className="file-label">
          Receipt image
        </label>
        <input id="receipt-image" type="file" accept="image/*" onChange={onImageChange} />

        <button type="submit" className="receipt-analyze-btn" disabled={uploading || bulkUploading}>
          {uploading ? "Analyzing..." : "Analyze + Save"}
        </button>
      </form>

      {previewUrl && <img src={previewUrl} alt="Receipt preview" className="preview" />}

      <hr />

      <form onSubmit={onBulkSubmit} className="form">
        <label htmlFor="receipt-images-bulk" className="file-label">
          Bulk ticket upload (up to 10)
        </label>
        <input id="receipt-images-bulk" type="file" accept="image/*" multiple onChange={onBulkImageChange} />
        {bulkFiles.length > 0 && (
          <p className="subtitle">
            {bulkFiles.length} selected: {bulkFiles.slice(0, 3).map((file) => file.name).join(", ")}
            {bulkFiles.length > 3 ? "..." : ""}
          </p>
        )}
        <button type="submit" className="receipt-analyze-btn secondary-btn" disabled={uploading || bulkUploading}>
          {bulkUploading ? "Analyzing Batch..." : "Analyze Batch"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
