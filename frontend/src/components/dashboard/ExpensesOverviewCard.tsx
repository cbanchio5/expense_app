import { ExpensesOverviewData } from "../../api";
import { formatDate, formatMoney } from "../../utils/formatters";

interface ExpensesOverviewCardProps {
  overview: ExpensesOverviewData;
  displayCurrency: string;
}

function formatMonthTick(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short" });
}

export function ExpensesOverviewCard({ overview, displayCurrency }: ExpensesOverviewCardProps) {
  const currentTotal = overview.current_month.totals.combined;
  const lastTotal = overview.last_month.totals.combined;
  const chartMax = Math.max(...overview.six_month_trend.map((entry) => entry.totals.combined), 1);

  return (
    <section className="card expenses-overview-card">
      <p className="kicker">Dedicated Overview</p>
      <h2>Expenses</h2>
      <p className="subtitle">
        Current month, last month, and a 6-month trend. Updated through {formatDate(overview.current_date)}.
      </p>

      <div className="expenses-month-grid">
        <article className="expenses-month-card current">
          <h3>Current month</h3>
          <strong>{formatMoney(currentTotal, displayCurrency)}</strong>
          <div className="totals-grid compact">
            <div>
              <span>{overview.members.user_1}</span>
              <strong>{formatMoney(overview.current_month.totals.user_1, displayCurrency)}</strong>
            </div>
            <div>
              <span>{overview.members.user_2}</span>
              <strong>{formatMoney(overview.current_month.totals.user_2, displayCurrency)}</strong>
            </div>
          </div>
        </article>

        <article className="expenses-month-card last">
          <h3>Last month</h3>
          <strong>{formatMoney(lastTotal, displayCurrency)}</strong>
          <div className="totals-grid compact">
            <div>
              <span>{overview.members.user_1}</span>
              <strong>{formatMoney(overview.last_month.totals.user_1, displayCurrency)}</strong>
            </div>
            <div>
              <span>{overview.members.user_2}</span>
              <strong>{formatMoney(overview.last_month.totals.user_2, displayCurrency)}</strong>
            </div>
          </div>
        </article>
      </div>

      <section className="expenses-chart-card">
        <div className="header-row">
          <h3>Last 6 months</h3>
          <div className="expenses-legend">
            <span className="legend-chip user-1">{overview.members.user_1}</span>
            <span className="legend-chip user-2">{overview.members.user_2}</span>
          </div>
        </div>

        <div className="expenses-chart-grid">
          {overview.six_month_trend.map((entry) => {
            const combined = entry.totals.combined;
            const barHeight = combined > 0 ? Math.max((combined / chartMax) * 100, 10) : 4;
            const user1Share = combined > 0 ? (entry.totals.user_1 / combined) * 100 : 0;
            const user2Share = combined > 0 ? (entry.totals.user_2 / combined) * 100 : 0;

            return (
              <div className="expenses-chart-column" key={entry.start_date}>
                <div className="expenses-chart-bar-shell">
                  <div className="expenses-chart-bar" style={{ height: `${barHeight}%` }}>
                    <span className="expenses-segment user-1" style={{ height: `${user1Share}%` }} />
                    <span className="expenses-segment user-2" style={{ height: `${user2Share}%` }} />
                  </div>
                </div>
                <strong>{formatMoney(combined, displayCurrency)}</strong>
                <span>{formatMonthTick(entry.start_date)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
