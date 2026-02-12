import { ReceiptRecord } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

interface ReceiptAnalysesCardProps {
  receipts: ReceiptRecord[];
  displayCurrency: string;
  onEditReceipt: (receipt: ReceiptRecord) => void;
}

export function ReceiptAnalysesCard({ receipts, displayCurrency, onEditReceipt }: ReceiptAnalysesCardProps) {
  return (
    <section className="card">
      <h2>All Receipt Analyses</h2>
      <p className="subtitle">All analyzed receipts for this household, including drafts not yet saved to totals.</p>
      <div className="table-wrap">
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
    </section>
  );
}
