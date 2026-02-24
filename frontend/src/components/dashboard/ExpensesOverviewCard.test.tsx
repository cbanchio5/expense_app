import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ExpensesOverviewData } from "../../api";
import { ExpensesOverviewCard } from "./ExpensesOverviewCard";

function buildOverview(): ExpensesOverviewData {
  return {
    household_code: "ABC123",
    household_name: "Integration House",
    current_date: "2026-02-23",
    members: {
      user_1: "Alex",
      user_2: "Jamie",
    },
    current_month: {
      month_label: "February 2026",
      start_date: "2026-02-01",
      end_date: "2026-02-23",
      totals: {
        user_1: 70,
        user_2: 30,
        combined: 100,
      },
      receipt_count: 4,
    },
    last_month: {
      month_label: "January 2026",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      totals: {
        user_1: 40,
        user_2: 40,
        combined: 80,
      },
      receipt_count: 3,
    },
    six_month_trend: [
      {
        month_label: "September 2025",
        start_date: "2025-09-01",
        end_date: "2025-09-30",
        totals: { user_1: 20, user_2: 10, combined: 30 },
        receipt_count: 2,
      },
      {
        month_label: "October 2025",
        start_date: "2025-10-01",
        end_date: "2025-10-31",
        totals: { user_1: 25, user_2: 20, combined: 45 },
        receipt_count: 2,
      },
      {
        month_label: "November 2025",
        start_date: "2025-11-01",
        end_date: "2025-11-30",
        totals: { user_1: 30, user_2: 10, combined: 40 },
        receipt_count: 2,
      },
      {
        month_label: "December 2025",
        start_date: "2025-12-01",
        end_date: "2025-12-31",
        totals: { user_1: 35, user_2: 20, combined: 55 },
        receipt_count: 3,
      },
      {
        month_label: "January 2026",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        totals: { user_1: 40, user_2: 40, combined: 80 },
        receipt_count: 3,
      },
      {
        month_label: "February 2026",
        start_date: "2026-02-01",
        end_date: "2026-02-23",
        totals: { user_1: 70, user_2: 30, combined: 100 },
        receipt_count: 4,
      },
    ],
    current_month_categories: {
      supermarket: 50,
      bills: 15,
      taxes: 10,
      entertainment: 20,
      other: 5,
      combined: 100,
    },
    last_month_categories: {
      supermarket: 35,
      bills: 20,
      taxes: 10,
      entertainment: 10,
      other: 5,
      combined: 80,
    },
    six_month_category_trend: [
      {
        month_label: "September 2025",
        start_date: "2025-09-01",
        end_date: "2025-09-30",
        categories: {
          supermarket: 10,
          bills: 7,
          taxes: 3,
          entertainment: 8,
          other: 2,
          combined: 30,
        },
      },
      {
        month_label: "October 2025",
        start_date: "2025-10-01",
        end_date: "2025-10-31",
        categories: {
          supermarket: 12,
          bills: 10,
          taxes: 4,
          entertainment: 14,
          other: 5,
          combined: 45,
        },
      },
      {
        month_label: "November 2025",
        start_date: "2025-11-01",
        end_date: "2025-11-30",
        categories: {
          supermarket: 16,
          bills: 8,
          taxes: 5,
          entertainment: 7,
          other: 4,
          combined: 40,
        },
      },
      {
        month_label: "December 2025",
        start_date: "2025-12-01",
        end_date: "2025-12-31",
        categories: {
          supermarket: 20,
          bills: 10,
          taxes: 7,
          entertainment: 13,
          other: 5,
          combined: 55,
        },
      },
      {
        month_label: "January 2026",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        categories: {
          supermarket: 35,
          bills: 20,
          taxes: 10,
          entertainment: 10,
          other: 5,
          combined: 80,
        },
      },
      {
        month_label: "February 2026",
        start_date: "2026-02-01",
        end_date: "2026-02-23",
        categories: {
          supermarket: 50,
          bills: 15,
          taxes: 10,
          entertainment: 20,
          other: 5,
          combined: 100,
        },
      },
    ],
  };
}

describe("ExpensesOverviewCard", () => {
  it("renders only one graph card and switches views with the filter", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExpensesOverviewCard overview={buildOverview()} displayCurrency="USD" />);

    expect(screen.getByLabelText(/graph view/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /last 6 months by member/i })).toBeTruthy();
    expect(container.querySelectorAll(".expenses-chart-card")).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText(/graph view/i), "category_trend");
    expect(screen.getByRole("heading", { name: /category trend \(6 months\)/i })).toBeTruthy();
    expect(container.querySelectorAll(".expenses-chart-card")).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText(/graph view/i), "current_categories");
    expect(screen.getByRole("heading", { name: /current month by category/i })).toBeTruthy();
    expect(container.querySelectorAll(".expenses-chart-card")).toHaveLength(1);
  });
});
