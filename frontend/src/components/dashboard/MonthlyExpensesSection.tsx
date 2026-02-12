import { DashboardData, MemberNames } from "../../api";
import { formatMoney } from "../../utils/formatters";
import { MonthCard } from "./MonthCard";

interface MonthlyExpensesSectionProps {
  dashboard: DashboardData;
  displayCurrency: string;
  members: MemberNames;
}

export function MonthlyExpensesSection({ dashboard, displayCurrency, members }: MonthlyExpensesSectionProps) {
  const owes = {
    user_1: dashboard.settlement.payer === "user_1" ? dashboard.settlement.amount : 0,
    user_2: dashboard.settlement.payer === "user_2" ? dashboard.settlement.amount : 0,
  };

  return (
    <section className="card">
      <h2>Monthly Totals</h2>
      <div className="month-grid">
        <MonthCard
          title="Current Month"
          summary={dashboard.current_month}
          currency={displayCurrency}
          members={members}
          variant="current"
        />
        <MonthCard
          title="Last Month"
          summary={dashboard.last_month}
          currency={displayCurrency}
          members={members}
          variant="last"
        />
      </div>
      <div className="owes-grid">
        <div className="owes-card">
          <span>{members.user_1} currently owes</span>
          <strong>{formatMoney(owes.user_1, displayCurrency)}</strong>
        </div>
        <div className="owes-card">
          <span>{members.user_2} currently owes</span>
          <strong>{formatMoney(owes.user_2, displayCurrency)}</strong>
        </div>
      </div>
    </section>
  );
}
