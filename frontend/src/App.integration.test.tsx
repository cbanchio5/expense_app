import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import * as api from "./api";
import type { DashboardData, ExpensesOverviewData, ReceiptRecord, SessionState } from "./api";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    analyzeReceipt: vi.fn(),
    analyzeReceiptsBulk: vi.fn(),
    createHouseholdSession: vi.fn(),
    createManualExpense: vi.fn(),
    deleteReceipt: vi.fn(),
    fetchDashboard: vi.fn(),
    fetchExpensesOverview: vi.fn(),
    fetchReceiptAnalyses: vi.fn(),
    fetchSession: vi.fn(),
    loginSession: vi.fn(),
    logoutSession: vi.fn(),
    settleHousehold: vi.fn(),
    updateReceiptItemAssignments: vi.fn(),
  };
});

function buildSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    user: null,
    user_name: null,
    household_code: null,
    household_name: null,
    ...overrides,
  };
}

function buildReceipt(overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id: 1,
    uploaded_by: "user_1",
    uploaded_by_name: "Alex",
    expense_date: "2026-02-23",
    vendor: "Store",
    currency: "USD",
    category: "other",
    subtotal: null,
    tax: null,
    tip: null,
    total: 42.5,
    items: [],
    is_saved: true,
    uploaded_at: "2026-02-23T10:00:00Z",
    ...overrides,
  };
}

function buildDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    household_code: "ABC123",
    household_name: "Integration House",
    current_user: "user_1",
    current_user_name: "Alex",
    members: {
      user_1: "Alex",
      user_2: "Jamie",
    },
    current_date: "2026-02-23",
    current_month: {
      month_label: "February 2026",
      start_date: "2026-02-01",
      end_date: "2026-02-23",
      totals: {
        user_1: 0,
        user_2: 0,
        combined: 0,
      },
      receipt_count: 0,
    },
    last_month: {
      month_label: "January 2026",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      totals: {
        user_1: 0,
        user_2: 0,
        combined: 0,
      },
      receipt_count: 0,
    },
    settlement: {
      payer: "",
      payer_name: "",
      payee: "",
      payee_name: "",
      amount: 0,
      message: "No transfer needed. Spending is currently balanced.",
    },
    notifications: [],
    recent_receipts: [],
    ...overrides,
  };
}

function buildExpensesOverview(): ExpensesOverviewData {
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
        user_1: 0,
        user_2: 0,
        combined: 0,
      },
      receipt_count: 0,
    },
    last_month: {
      month_label: "January 2026",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      totals: {
        user_1: 0,
        user_2: 0,
        combined: 0,
      },
      receipt_count: 0,
    },
    six_month_trend: [],
    current_month_categories: {
      supermarket: 0,
      bills: 0,
      taxes: 0,
      entertainment: 0,
      other: 0,
      combined: 0,
    },
    last_month_categories: {
      supermarket: 0,
      bills: 0,
      taxes: 0,
      entertainment: 0,
      other: 0,
      combined: 0,
    },
    six_month_category_trend: [],
  };
}

describe("App integration flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/");

    vi.mocked(api.fetchReceiptAnalyses).mockResolvedValue({ analyses: [] });
    vi.mocked(api.fetchExpensesOverview).mockResolvedValue(buildExpensesOverview());
    vi.mocked(api.loginSession).mockResolvedValue(buildSession({ user: "user_1", user_name: "Alex" }));
    vi.mocked(api.logoutSession).mockResolvedValue(undefined);
    vi.mocked(api.analyzeReceipt).mockResolvedValue({ receipt: buildReceipt({ is_saved: false, items: [] }) });
    vi.mocked(api.updateReceiptItemAssignments).mockResolvedValue({ receipt: buildReceipt() });
    vi.mocked(api.deleteReceipt).mockResolvedValue({ detail: "Receipt deleted." });
    vi.mocked(api.settleHousehold).mockResolvedValue({
      detail: "Settled.",
      settlement: {
        payer: "",
        payer_name: "",
        payee: "",
        payee_name: "",
        amount: 0,
        message: "No transfer needed.",
      },
      notifications: [],
    });
  });

  it("creates a household and lands on dashboard", async () => {
    const user = userEvent.setup();

    vi.mocked(api.fetchSession).mockResolvedValue(buildSession());
    vi.mocked(api.createHouseholdSession).mockResolvedValue(
      buildSession({
        user: "user_1",
        user_name: "Alex",
        household_name: "Integration House",
        household_code: "ABC123",
        members: { user_1: "Alex", user_2: "Jamie" },
      })
    );
    vi.mocked(api.fetchDashboard).mockResolvedValue(buildDashboard());

    render(<App />);

    await screen.findByRole("heading", { name: /choose what you need/i });
    await user.click(screen.getByRole("button", { name: /^create household$/i }));
    await screen.findByRole("heading", { name: /create household session/i });

    await user.type(screen.getByLabelText(/^household name$/i), "  Integration House  ");
    await user.type(screen.getByLabelText(/member one name/i), " Alex ");
    await user.type(screen.getByLabelText(/member two name/i), " Jamie ");
    await user.type(screen.getByLabelText(/^passcode$/i), "1234");
    await user.click(screen.getByRole("button", { name: /create session/i }));

    await waitFor(() =>
      expect(vi.mocked(api.createHouseholdSession)).toHaveBeenCalledWith({
        household_name: "Integration House",
        member_1_name: "Alex",
        member_2_name: "Jamie",
        passcode: "1234",
      })
    );

    await screen.findByRole("heading", { name: "Alex" });
    expect(vi.mocked(api.fetchDashboard)).toHaveBeenCalledTimes(1);
  });

  it("saves a manual expense and refreshes dashboard data", async () => {
    const user = userEvent.setup();

    vi.mocked(api.fetchSession).mockResolvedValue(
      buildSession({
        user: "user_1",
        user_name: "Alex",
        household_name: "Integration House",
        household_code: "ABC123",
        members: { user_1: "Alex", user_2: "Jamie" },
      })
    );
    vi.mocked(api.fetchDashboard)
      .mockResolvedValueOnce(buildDashboard())
      .mockResolvedValueOnce(
        buildDashboard({
          current_month: {
            month_label: "February 2026",
            start_date: "2026-02-01",
            end_date: "2026-02-23",
            totals: {
              user_1: 42.5,
              user_2: 0,
              combined: 42.5,
            },
            receipt_count: 1,
          },
        })
      );
    vi.mocked(api.createManualExpense).mockResolvedValue({ receipt: buildReceipt() });

    render(<App />);
    await screen.findByRole("heading", { name: "Alex" });

    await user.click(screen.getByRole("button", { name: /manual expense/i }));
    await user.type(screen.getByLabelText(/vendor/i), "Farmers Market");
    await user.type(screen.getByLabelText(/total amount/i), "42.50");
    await user.click(screen.getByRole("button", { name: /save manual expense/i }));

    await waitFor(() =>
      expect(vi.mocked(api.createManualExpense)).toHaveBeenCalledWith({
        vendor: "Farmers Market",
        total: 42.5,
        expense_date: undefined,
        currency: "USD",
        category: "other",
        notes: "",
      })
    );

    await screen.findByText(/manual expense saved and totals updated\./i);
    await waitFor(() => expect(vi.mocked(api.fetchDashboard)).toHaveBeenCalledTimes(2));
  });

  it("shows detailed bulk upload error message for multi-receipt failure", async () => {
    const user = userEvent.setup();

    vi.mocked(api.fetchSession).mockResolvedValue(
      buildSession({
        user: "user_1",
        user_name: "Alex",
        household_name: "Integration House",
        household_code: "ABC123",
        members: { user_1: "Alex", user_2: "Jamie" },
      })
    );
    vi.mocked(api.fetchDashboard).mockResolvedValue(buildDashboard());
    vi.mocked(api.analyzeReceiptsBulk).mockRejectedValue(
      new api.ApiRequestError("No receipts were analyzed successfully.", 400, {
        failed: [
          { filename: "too-large.jpg", detail: "Image file is too large. Please upload a smaller ticket image." },
          { filename: "blurry.jpg", detail: "Could not parse ticket." },
        ],
      })
    );

    render(<App />);
    await screen.findByRole("heading", { name: "Alex" });

    const input = screen.getByLabelText(/ticket image\(s\)/i) as HTMLInputElement;
    const fileA = new File(["a"], "too-large.jpg", { type: "image/jpeg" });
    const fileB = new File(["b"], "blurry.jpg", { type: "image/jpeg" });
    await user.upload(input, [fileA, fileB]);

    await user.click(screen.getByRole("button", { name: /analyze ticket\(s\)/i }));

    await waitFor(() => expect(vi.mocked(api.analyzeReceiptsBulk)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.analyzeReceipt)).not.toHaveBeenCalled();

    const uploadArg = vi.mocked(api.analyzeReceiptsBulk).mock.calls[0][0];
    expect(uploadArg).toHaveLength(2);
    expect(uploadArg[0].name).toBe("too-large.jpg");
    expect(uploadArg[1].name).toBe("blurry.jpg");

    await screen.findByText(/we could not read any receipts from this batch\./i);
    await screen.findByText(/too-large\.jpg: image file is too large/i);
    await screen.findByText(/blurry\.jpg: could not parse ticket\./i);
  });
});
