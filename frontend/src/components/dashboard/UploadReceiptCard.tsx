import { ChangeEvent, FormEvent } from "react";

interface UploadReceiptCardProps {
  uploading: boolean;
  previewUrl: string;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function UploadReceiptCard({ uploading, previewUrl, error, onSubmit, onImageChange }: UploadReceiptCardProps) {
  return (
    <section className="card upload-card">
      <h2>Upload New Receipt</h2>
      <p className="subtitle">Your receipt is saved into this household session automatically.</p>
      <form onSubmit={onSubmit} className="form">
        <label htmlFor="receipt-image" className="file-label">
          Receipt image
        </label>
        <input id="receipt-image" type="file" accept="image/*" onChange={onImageChange} />

        <button type="submit" disabled={uploading}>
          {uploading ? "Analyzing..." : "Analyze + Save"}
        </button>
      </form>

      {previewUrl && <img src={previewUrl} alt="Receipt preview" className="preview" />}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
