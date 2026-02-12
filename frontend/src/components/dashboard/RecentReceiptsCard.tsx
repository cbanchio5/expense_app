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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Vendor</th>
              <th>Total</th>
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
