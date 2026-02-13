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

const CATEGORY_DEFS = [
  { key: "supermarket", label: "Supermarket", className: "category-supermarket" },
  { key: "bills", label: "Bills", className: "category-bills" },
  { key: "taxes", label: "Taxes", className: "category-taxes" },
  { key: "entertainment", label: "Entertainment", className: "category-entertainment" },
  { key: "other", label: "Other", className: "category-other" },
] as const;

export function ExpensesOverviewCard({ overview, displayCurrency }: ExpensesOverviewCardProps) {
  const currentTotal = overview.current_month.totals.combined;
  const lastTotal = overview.last_month.totals.combined;
  const chartMax = Math.max(...overview.six_month_trend.map((entry) => entry.totals.combined), 1);
  const categoryMax = Math.max(
    ...CATEGORY_DEFS.map((entry) => overview.current_month_categories[entry.key]),
    ...CATEGORY_DEFS.map((entry) => overview.last_month_categories[entry.key]),
    1
  );
  const categoryTrendMax = Math.max(
    ...overview.six_month_category_trend.map((entry) => entry.categories.combined),
    1
  );

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

      <section className="expenses-category-month-grid">
        <article className="expenses-chart-card category-month-card">
          <h3>Current month by category</h3>
          <div className="category-bars">
            {CATEGORY_DEFS.map((entry) => {
              const value = overview.current_month_categories[entry.key];
              const barHeight = value > 0 ? Math.max((value / categoryMax) * 100, 8) : 4;
              return (
                <div key={`current-${entry.key}`} className="category-bar-column">
                  <div className="expenses-chart-bar-shell">
                    <div className={`expenses-chart-bar ${entry.className}`} style={{ height: `${barHeight}%` }} />
                  </div>
                  <strong>{formatMoney(value, displayCurrency)}</strong>
                  <span>{entry.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="expenses-chart-card category-month-card">
          <h3>Last month by category</h3>
          <div className="category-bars">
            {CATEGORY_DEFS.map((entry) => {
              const value = overview.last_month_categories[entry.key];
              const barHeight = value > 0 ? Math.max((value / categoryMax) * 100, 8) : 4;
              return (
                <div key={`last-${entry.key}`} className="category-bar-column">
                  <div className="expenses-chart-bar-shell">
                    <div className={`expenses-chart-bar ${entry.className}`} style={{ height: `${barHeight}%` }} />
                  </div>
                  <strong>{formatMoney(value, displayCurrency)}</strong>
                  <span>{entry.label}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="expenses-chart-card category-trend-card">
        <div className="header-row">
          <h3>Category trend (6 months)</h3>
          <div className="expenses-legend">
            {CATEGORY_DEFS.map((entry) => (
              <span key={`legend-${entry.key}`} className={`legend-chip ${entry.className}`}>
                {entry.label}
              </span>
            ))}
          </div>
        </div>

        <div className="expenses-chart-grid">
          {overview.six_month_category_trend.map((entry) => {
            const combined = entry.categories.combined;
            const barHeight = combined > 0 ? Math.max((combined / categoryTrendMax) * 100, 10) : 4;
            return (
              <div className="expenses-chart-column" key={`category-trend-${entry.start_date}`}>
                <div className="expenses-chart-bar-shell">
                  <div className="expenses-chart-bar" style={{ height: `${barHeight}%` }}>
                    {CATEGORY_DEFS.map((categoryEntry) => {
                      const value = entry.categories[categoryEntry.key];
                      const share = combined > 0 ? (value / combined) * 100 : 0;
                      return (
                        <span
                          key={`${entry.start_date}-${categoryEntry.key}`}
                          className={`expenses-segment ${categoryEntry.className}`}
                          style={{ height: `${share}%` }}
                        />
                      );
                    })}
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
