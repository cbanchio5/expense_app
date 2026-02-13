const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const API_BASE_URL = /^https?:\/\//.test(rawApiBaseUrl) ? rawApiBaseUrl : `https://${rawApiBaseUrl}`;
const SESSION_TOKEN_STORAGE_KEY = "splithappens_session_token";

export type UserCode = "user_1" | "user_2";
export type AssignedTo = "shared" | UserCode;

export interface MemberNames {
  user_1: string;
  user_2: string;
}

export interface SessionState {
  user: UserCode | null;
  user_name: string | null;
  household_code: string | null;
  household_name: string | null;
  session_token?: string | null;
  members?: MemberNames;
}

export interface CreateHouseholdInput {
  household_name: string;
  member_1_name: string;
  member_2_name: string;
  passcode: string;
}

export interface ManualExpenseInput {
  vendor?: string;
  expense_date?: string;
  currency?: string;
  total: number;
  notes?: string;
}

export interface ReceiptItem {
  name: string;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  assigned_to?: AssignedTo;
}

export interface ReceiptRecord {
  id: number;
  uploaded_by: UserCode;
  uploaded_by_name: string;
  expense_date: string;
  vendor: string;
  currency: string;
  subtotal?: number | null;
  tax?: number | null;
  tip?: number | null;
  total?: number | null;
  items: ReceiptItem[];
  is_saved: boolean;
  uploaded_at: string;
}

interface AnalyzeReceiptResponse {
  receipt: ReceiptRecord;
}

interface UpdateReceiptItemsResponse {
  receipt: ReceiptRecord;
}

export interface MonthSummary {
  month_label: string;
  start_date: string;
  end_date: string;
  totals: {
    user_1: number;
    user_2: number;
    combined: number;
  };
  receipt_count: number;
}

export interface Settlement {
  payer: UserCode | "";
  payer_name: string;
  payee: UserCode | "";
  payee_name: string;
  amount: number;
  message: string;
}

export interface DashboardNotification {
  user: string;
  message: string;
  read: boolean;
}

export interface SettleResponse {
  detail: string;
  settlement: Settlement;
  notifications: DashboardNotification[];
}

export interface DashboardData {
  household_code: string;
  household_name: string;
  current_user: UserCode;
  current_user_name: string;
  members: MemberNames;
  current_date: string;
  current_month: MonthSummary;
  last_month: MonthSummary;
  settlement: Settlement;
  notifications: DashboardNotification[];
  recent_receipts: ReceiptRecord[];
}

export interface ExpensesOverviewData {
  household_code: string;
  household_name: string;
  current_date: string;
  members: MemberNames;
  current_month: MonthSummary;
  last_month: MonthSummary;
  six_month_trend: MonthSummary[];
}

export interface ReceiptAnalysesData {
  analyses: ReceiptRecord[];
}

interface ApiError {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractErrorMessage(item);
      if (message) return message;
    }
    return null;
  }
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = extractErrorMessage(record.detail);
    if (detail) return detail;

    const nonField = extractErrorMessage(record.non_field_errors);
    if (nonField) return nonField;

    for (const [key, value] of Object.entries(record)) {
      if (key === "detail" || key === "non_field_errors") continue;
      const nested = extractErrorMessage(value);
      if (nested) return nested;
    }
  }
  return null;
}

function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
}

function setStoredSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  let data: (T & ApiError) | null = null;
  try {
    data = (await response.json()) as T & ApiError;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data) || `Request failed (${response.status}).`);
  }

  if (data && typeof data === "object" && "session_token" in data) {
    const token = (data as { session_token?: unknown }).session_token;
    setStoredSessionToken(typeof token === "string" && token.trim() ? token : null);
  }

  return data as T;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const storedToken = getStoredSessionToken();
  if (storedToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${storedToken}`);
  }

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
  return parseApiResponse<T>(response);
}

export async function createHouseholdSession(input: CreateHouseholdInput): Promise<SessionState> {
  return apiFetch<SessionState>(`${API_BASE_URL}/api/receipts/households/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function loginSession(householdName: string, name: string, passcode: string): Promise<SessionState> {
  return apiFetch<SessionState>(`${API_BASE_URL}/api/receipts/session/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ household_name: householdName, name, passcode }),
  });
}

export async function logoutSession(): Promise<void> {
  try {
    await apiFetch<{ detail: string }>(`${API_BASE_URL}/api/receipts/session/logout/`, {
      method: "POST",
    });
  } finally {
    setStoredSessionToken(null);
  }
}

export async function fetchSession(): Promise<SessionState> {
  return apiFetch<SessionState>(`${API_BASE_URL}/api/receipts/session/me/`, {
    method: "GET",
  });
}

export async function analyzeReceipt(imageFile: File): Promise<AnalyzeReceiptResponse> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return apiFetch<AnalyzeReceiptResponse>(`${API_BASE_URL}/api/receipts/analyze/`, {
    method: "POST",
    body: formData,
  });
}

export async function updateReceiptItemAssignments(
  receiptId: number,
  assignments: Array<{ index: number; assigned_to: AssignedTo }>
): Promise<UpdateReceiptItemsResponse> {
  return apiFetch<UpdateReceiptItemsResponse>(`${API_BASE_URL}/api/receipts/${receiptId}/items/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assignments }),
  });
}

export async function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>(`${API_BASE_URL}/api/receipts/dashboard/`, {
    method: "GET",
  });
}

export async function fetchReceiptAnalyses(): Promise<ReceiptAnalysesData> {
  return apiFetch<ReceiptAnalysesData>(`${API_BASE_URL}/api/receipts/analyses/`, {
    method: "GET",
  });
}

export async function fetchExpensesOverview(): Promise<ExpensesOverviewData> {
  return apiFetch<ExpensesOverviewData>(`${API_BASE_URL}/api/receipts/expenses/`, {
    method: "GET",
  });
}

export async function createManualExpense(input: ManualExpenseInput): Promise<AnalyzeReceiptResponse> {
  return apiFetch<AnalyzeReceiptResponse>(`${API_BASE_URL}/api/receipts/manual/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function settleHousehold(): Promise<SettleResponse> {
  return apiFetch<SettleResponse>(`${API_BASE_URL}/api/receipts/settle/`, {
    method: "POST",
  });
}
