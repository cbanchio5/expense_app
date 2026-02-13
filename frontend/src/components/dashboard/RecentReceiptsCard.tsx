import { ReceiptRecord } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

interface RecentReceiptsCardProps {
  receipts: ReceiptRecord[];
  displayCurrency: string;
  onEditReceipt: (receipt: ReceiptRecord) => void;
}

export function RecentReceiptsCard({ receipts, displayCurrency, onEditReceipt }: RecentReceiptsCardProps) {
  return (
    <section className="card">
      <h2>Recent Receipts</h2>
      <div className="table-wrap recent-receipts-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Vendor</th>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="receipt-list-mobile">
        {receipts.map((receipt) => (
          <article key={`recent-mobile-${receipt.id}`} className="receipt-list-mobile-item">
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
          </article>
        ))}
      </div>
    </section>
  );
}
