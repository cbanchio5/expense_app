import { ReceiptRecord } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

interface ReceiptAnalysesCardProps {
  receipts: ReceiptRecord[];
  displayCurrency: string;
  onEditReceipt: (receipt: ReceiptRecord) => void;
  onDeleteReceipt: (receipt: ReceiptRecord) => void;
  deletingReceiptId: number | null;
}

export function ReceiptAnalysesCard({
  receipts,
  displayCurrency,
  onEditReceipt,
  onDeleteReceipt,
  deletingReceiptId,
}: ReceiptAnalysesCardProps) {
  return (
    <section className="card">
      <h2>All Receipt Analyses</h2>
      <p className="subtitle">All analyzed receipts for this household, including drafts not yet saved to totals.</p>
      <div className="table-wrap analyses-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>{formatDate(receipt.expense_date)}</td>
                <td>{receipt.uploaded_by_name}</td>
                <td>{receipt.vendor || "-"}</td>
                <td>{formatCategory(receipt.category || "other")}</td>
                <td>{formatMoney(receipt.total, receipt.currency || displayCurrency)}</td>
                <td>
                  <span className={receipt.is_saved ? "status-badge saved" : "status-badge draft"}>
                    {receipt.is_saved ? "Saved" : "Draft"}
                  </span>
                </td>
                <td>
                  <button type="button" className="table-action-btn" onClick={() => onEditReceipt(receipt)}>
                    Edit items
                  </button>
                  <button
                    type="button"
                    className="table-action-btn danger-btn"
                    onClick={() => onDeleteReceipt(receipt)}
                    disabled={deletingReceiptId === receipt.id}
                  >
                    {deletingReceiptId === receipt.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="receipt-list-mobile">
        {receipts.map((receipt) => (
          <article key={`analysis-mobile-${receipt.id}`} className="receipt-list-mobile-item">
            <div className="totals-grid compact">
              <div>
                <span>Date</span>
                <strong>{formatDate(receipt.expense_date)}</strong>
              </div>
              <div>
                <span>Member</span>
                <strong>{receipt.uploaded_by_name}</strong>
              </div>
              <div>
                <span>Vendor</span>
                <strong>{receipt.vendor || "-"}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{formatCategory(receipt.category || "other")}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatMoney(receipt.total, receipt.currency || displayCurrency)}</strong>
              </div>
            </div>
            <span className={receipt.is_saved ? "status-badge saved" : "status-badge draft"}>
              {receipt.is_saved ? "Saved" : "Draft"}
            </span>
            <button type="button" className="table-action-btn" onClick={() => onEditReceipt(receipt)}>
              Edit items
            </button>
            <button
              type="button"
              className="table-action-btn danger-btn"
              onClick={() => onDeleteReceipt(receipt)}
              disabled={deletingReceiptId === receipt.id}
            >
              {deletingReceiptId === receipt.id ? "Deleting..." : "Delete"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
