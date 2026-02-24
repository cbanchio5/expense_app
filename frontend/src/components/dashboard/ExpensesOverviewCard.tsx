import { useMemo, useState } from "react";
import type { ExpensesOverviewData } from "../../api";
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

type GraphView = "member_trend" | "category_trend" | "current_categories" | "last_categories";

type GraphColumn = {
  key: string;
  value: number;
  label: string;
  barHeight: number;
  segments: Array<{ key: string; className: string; share: number }>;
};

type GraphModel = {
  title: string;
  subtitle: string;
  legend: Array<{ key: string; label: string; className: string }>;
  columns: GraphColumn[];
};

export function ExpensesOverviewCard({ overview, displayCurrency }: ExpensesOverviewCardProps) {
  const [graphView, setGraphView] = useState<GraphView>("member_trend");
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
  const graphModel = useMemo<GraphModel>(() => {
    if (graphView === "member_trend") {
      return {
        title: "Last 6 months by member",
        subtitle: "Each column shows combined spend split between members.",
        legend: [
          { key: "user-1", label: overview.members.user_1, className: "user-1" },
          { key: "user-2", label: overview.members.user_2, className: "user-2" },
        ],
        columns: overview.six_month_trend.map((entry) => {
          const combined = entry.totals.combined;
          const barHeight = combined > 0 ? Math.max((combined / chartMax) * 100, 10) : 4;
          const user1Share = combined > 0 ? (entry.totals.user_1 / combined) * 100 : 0;
          const user2Share = combined > 0 ? (entry.totals.user_2 / combined) * 100 : 0;
          return {
            key: entry.start_date,
            value: combined,
            label: formatMonthTick(entry.start_date),
            barHeight,
            segments: [
              { key: `${entry.start_date}-u1`, className: "user-1", share: user1Share },
              { key: `${entry.start_date}-u2`, className: "user-2", share: user2Share },
            ],
          };
        }),
      };
    }

    if (graphView === "category_trend") {
      return {
        title: "Category trend (6 months)",
        subtitle: "Each column shows combined spend split by category.",
        legend: CATEGORY_DEFS.map((entry) => ({
          key: entry.key,
          label: entry.label,
          className: entry.className,
        })),
        columns: overview.six_month_category_trend.map((entry) => {
          const combined = entry.categories.combined;
          const barHeight = combined > 0 ? Math.max((combined / categoryTrendMax) * 100, 10) : 4;
          return {
            key: `category-trend-${entry.start_date}`,
            value: combined,
            label: formatMonthTick(entry.start_date),
            barHeight,
            segments: CATEGORY_DEFS.map((categoryEntry) => {
              const value = entry.categories[categoryEntry.key];
              const share = combined > 0 ? (value / combined) * 100 : 0;
              return {
                key: `${entry.start_date}-${categoryEntry.key}`,
                className: categoryEntry.className,
                share,
              };
            }),
          };
        }),
      };
    }

    const isCurrent = graphView === "current_categories";
    const categoryValues = isCurrent ? overview.current_month_categories : overview.last_month_categories;
    const periodLabel = isCurrent ? "Current month" : "Last month";
    return {
      title: `${periodLabel} by category`,
      subtitle: "Use this filter to compare category composition month by month.",
      legend: CATEGORY_DEFS.map((entry) => ({
        key: entry.key,
        label: entry.label,
        className: entry.className,
      })),
      columns: CATEGORY_DEFS.map((entry) => {
        const value = categoryValues[entry.key];
        const barHeight = value > 0 ? Math.max((value / categoryMax) * 100, 8) : 4;
        return {
          key: `${periodLabel}-${entry.key}`,
          value,
          label: entry.label,
          barHeight,
          segments: value > 0 ? [{ key: `${periodLabel}-${entry.key}-segment`, className: entry.className, share: 100 }] : [],
        };
      }),
    };
  }, [categoryMax, categoryTrendMax, chartMax, graphView, overview]);

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

      <section className="expenses-graph-controls">
        <label htmlFor="expenses-graph-view">Graph view</label>
        <select
          id="expenses-graph-view"
          value={graphView}
          onChange={(event) => setGraphView(event.target.value as GraphView)}
        >
          <option value="member_trend">Last 6 months by member</option>
          <option value="category_trend">Category trend (6 months)</option>
          <option value="current_categories">Current month by category</option>
          <option value="last_categories">Last month by category</option>
        </select>
      </section>

      <section className="expenses-chart-card">
        <div className="header-row">
          <h3>{graphModel.title}</h3>
          <div className="expenses-legend">
            {graphModel.legend.map((entry) => (
              <span key={entry.key} className={`legend-chip ${entry.className}`}>
                {entry.label}
              </span>
            ))}
          </div>
        </div>
        <p className="subtitle">{graphModel.subtitle}</p>

        <div className="expenses-chart-grid">
          {graphModel.columns.map((column) => {
            return (
              <div className="expenses-chart-column" key={column.key}>
                <div className="expenses-chart-bar-shell">
                  <div className="expenses-chart-bar" style={{ height: `${column.barHeight}%` }}>
                    {column.segments.map((segment) => (
                      <span
                        key={segment.key}
                        className={`expenses-segment ${segment.className}`}
                        style={{ height: `${segment.share}%` }}
                      />
                    ))}
                  </div>
                </div>
                <strong>{formatMoney(column.value, displayCurrency)}</strong>
                <span>{column.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
