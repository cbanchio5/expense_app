import { FormEvent } from "react";

interface ManualExpenseCardProps {
  vendor: string;
  total: string;
  expenseDate: string;
  currency: string;
  currencyOptions: Array<{ code: string; label: string }>;
  notes: string;
  saving: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVendorChange: (value: string) => void;
  onTotalChange: (value: string) => void;
  onExpenseDateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function ManualExpenseCard({
  vendor,
  total,
  expenseDate,
  currency,
  currencyOptions,
  notes,
  saving,
  error,
  onSubmit,
  onVendorChange,
  onTotalChange,
  onExpenseDateChange,
  onCurrencyChange,
  onNotesChange,
}: ManualExpenseCardProps) {
  return (
    <section className="card manual-card">
      <h2>Add Expense Without Receipt</h2>
      <p className="subtitle">Add an expense directly when you do not have a receipt image.</p>
      <form onSubmit={onSubmit} className="form">
        <label htmlFor="manual-vendor">Vendor</label>
        <input
          id="manual-vendor"
          type="text"
          placeholder="e.g. Farmers Market"
          value={vendor}
          onChange={(event) => onVendorChange(event.target.value)}
        />

        <label htmlFor="manual-total">Total amount</label>
        <input
          id="manual-total"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={total}
          onChange={(event) => onTotalChange(event.target.value)}
        />

        <div className="manual-inline-fields">
          <div>
            <label htmlFor="manual-date">Expense date</label>
            <input
              id="manual-date"
              type="date"
              value={expenseDate}
              onChange={(event) => onExpenseDateChange(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="manual-currency">Currency</label>
            <select
              id="manual-currency"
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value)}
            >
              {currencyOptions.map((currencyOption) => (
                <option key={currencyOption.code} value={currencyOption.code}>
                  {currencyOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="manual-notes">Notes (optional)</label>
        <input
          id="manual-notes"
          type="text"
          placeholder="Quick detail"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save manual expense"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
