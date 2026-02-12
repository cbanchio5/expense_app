import { DashboardData, MemberNames } from "../../api";
import { MonthCard } from "./MonthCard";

interface MonthlyExpensesSectionProps {
  dashboard: DashboardData;
  displayCurrency: string;
  members: MemberNames;
}

export function MonthlyExpensesSection({ dashboard, displayCurrency, members }: MonthlyExpensesSectionProps) {
  return (
    <section className="card">
      <h2>Monthly Expenses</h2>
      <div className="month-grid">
        <MonthCard title="Current Month" summary={dashboard.current_month} currency={displayCurrency} members={members} />
        <MonthCard title="Last Month" summary={dashboard.last_month} currency={displayCurrency} members={members} />
      </div>
    </section>
  );
}
