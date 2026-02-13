import { ChangeEvent, FormEvent } from "react";

interface UploadReceiptCardProps {
  uploading: boolean;
  previewUrl: string;
  selectedFiles: File[];
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function UploadReceiptCard({
  uploading,
  previewUrl,
  selectedFiles,
  error,
  onSubmit,
  onFilesChange,
}: UploadReceiptCardProps) {
  return (
    <section className="card upload-card">
      <h2>Upload Receipt Tickets</h2>
      <p className="subtitle">Pick one ticket or multiple tickets (up to 10) and analyze in one go.</p>
      <form onSubmit={onSubmit} className="form">
        <label htmlFor="receipt-images" className="file-label">
          Ticket image(s)
        </label>
        <input id="receipt-images" type="file" accept="image/*" multiple onChange={onFilesChange} />

        {selectedFiles.length > 0 && (
          <p className="subtitle">
            {selectedFiles.length} selected: {selectedFiles.slice(0, 3).map((file) => file.name).join(", ")}
            {selectedFiles.length > 3 ? "..." : ""}
          </p>
        )}

        <button type="submit" className="receipt-analyze-btn" disabled={uploading}>
          {uploading ? "Analyzing..." : "Analyze Ticket(s)"}
        </button>
      </form>

      {previewUrl && <img src={previewUrl} alt="Receipt preview" className="preview" />}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
