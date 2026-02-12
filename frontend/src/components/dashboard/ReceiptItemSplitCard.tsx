import { AssignedTo, MemberNames, ReceiptRecord } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

interface ReceiptItemSplitCardProps {
  receipt: ReceiptRecord;
  members: MemberNames;
  displayCurrency: string;
  savingItemAssignments: boolean;
  onSave: () => void;
  onAssignmentChange: (itemIndex: number, assignedTo: AssignedTo) => void;
}

export function ReceiptItemSplitCard({
  receipt,
  members,
  displayCurrency,
  savingItemAssignments,
  onSave,
  onAssignmentChange,
}: ReceiptItemSplitCardProps) {
  return (
    <section className="card">
      <div className="header-row">
        <h2>Receipt Item Split</h2>
        <button type="button" onClick={onSave} disabled={savingItemAssignments}>
          {savingItemAssignments ? "Saving..." : "Save receipt + update totals"}
        </button>
      </div>
      <p className="subtitle">Mark items as shared or individual. Individual items count fully for the selected member.</p>
      <div className="totals-grid">
        <div>
          <span>Member</span>
          <strong>{receipt.uploaded_by_name}</strong>
        </div>
        <div>
          <span>Vendor</span>
          <strong>{receipt.vendor || "-"}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>{formatDate(receipt.expense_date)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatMoney(receipt.total, receipt.currency || displayCurrency)}</strong>
        </div>
      </div>
      <h3>Items</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Total</th>
              <th>Split rule</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, idx) => (
              <tr key={`${item.name}-${idx}`}>
                <td>{item.name}</td>
                <td>{item.quantity ?? "-"}</td>
                <td>{formatMoney(item.unit_price, receipt.currency || displayCurrency)}</td>
                <td>{formatMoney(item.total_price, receipt.currency || displayCurrency)}</td>
                <td>
                  <select
                    className="item-assignment"
                    value={(item.assigned_to || "shared") as AssignedTo}
                    onChange={(event) => onAssignmentChange(idx, event.target.value as AssignedTo)}
                  >
                    <option value="shared">Shared (50/50)</option>
                    <option value="user_1">{members.user_1} pays full</option>
                    <option value="user_2">{members.user_2} pays full</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
