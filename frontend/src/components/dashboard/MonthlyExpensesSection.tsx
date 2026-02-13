import { useEffect, useState } from "react";
import { DashboardData, MemberNames } from "../../api";
import { formatMoney } from "../../utils/formatters";
import { MonthCard } from "./MonthCard";

interface MonthlyExpensesSectionProps {
  dashboard: DashboardData;
  displayCurrency: string;
  members: MemberNames;
}

export function MonthlyExpensesSection({ dashboard, displayCurrency, members }: MonthlyExpensesSectionProps) {
  const currentTotal = dashboard.current_month.totals.combined;
  const owes = {
    user_1: dashboard.settlement.payer === "user_1" ? dashboard.settlement.amount : 0,
    user_2: dashboard.settlement.payer === "user_2" ? dashboard.settlement.amount : 0,
  };
  const spendShares = {
    user_1: currentTotal > 0 ? (dashboard.current_month.totals.user_1 / currentTotal) * 100 : 0,
    user_2: currentTotal > 0 ? (dashboard.current_month.totals.user_2 / currentTotal) * 100 : 0,
  };
  const [showBreakdown, setShowBreakdown] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 700;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => setShowBreakdown(!media.matches);
    sync();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return (
    <section className="card">
      <div className="header-row">
        <h2>Monthly Totals</h2>
        <button type="button" className="secondary-btn table-action-btn" onClick={() => setShowBreakdown((value) => !value)}>
          {showBreakdown ? "Hide details" : "Show details"}
        </button>
      </div>
      <div className="current-total-hero">
        <div className="current-total-main">
          <span>Current month total</span>
          <strong>{formatMoney(currentTotal, displayCurrency)}</strong>
        </div>
        <div className="last-month-mini">
          <span>Last month</span>
          <strong>{formatMoney(dashboard.last_month.totals.combined, displayCurrency)}</strong>
        </div>
      </div>

      <div className="spend-grid">
        <div className="spend-card user-1">
          <span>{members.user_1} spent</span>
          <strong>{formatMoney(dashboard.current_month.totals.user_1, displayCurrency)}</strong>
          <small>{spendShares.user_1.toFixed(1)}% of current total</small>
        </div>
        <div className="spend-card user-2">
          <span>{members.user_2} spent</span>
          <strong>{formatMoney(dashboard.current_month.totals.user_2, displayCurrency)}</strong>
          <small>{spendShares.user_2.toFixed(1)}% of current total</small>
        </div>
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

      {showBreakdown && (
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
      )}
    </section>
  );
}
