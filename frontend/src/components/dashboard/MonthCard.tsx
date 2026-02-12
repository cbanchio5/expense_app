import { MemberNames, MonthSummary } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

interface MonthCardProps {
  title: string;
  summary: MonthSummary;
  currency: string;
  members: MemberNames;
  variant: "current" | "last";
}

export function MonthCard({ title, summary, currency, members, variant }: MonthCardProps) {
  return (
    <div className={`month-card ${variant === "current" ? "month-card-current" : "month-card-last"}`}>
      <h3 className="month-card-title">{title}</h3>
      <p className="month-range">
        {summary.month_label} ({formatDate(summary.start_date)} - {formatDate(summary.end_date)})
      </p>
      <div className="totals-grid compact">
        <div>
          <span>{members.user_1}</span>
          <strong>{formatMoney(summary.totals.user_1, currency)}</strong>
        </div>
        <div>
          <span>{members.user_2}</span>
          <strong>{formatMoney(summary.totals.user_2, currency)}</strong>
        </div>
        <div>
          <span>Combined</span>
          <strong>{formatMoney(summary.totals.combined, currency)}</strong>
        </div>
        <div>
          <span>Receipts</span>
          <strong>{summary.receipt_count}</strong>
        </div>
      </div>
    </div>
  );
}
