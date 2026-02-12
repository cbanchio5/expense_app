import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AssignedTo,
  analyzeReceipt,
  createHouseholdSession,
  DashboardData,
  fetchDashboard,
  fetchSession,
  loginSession,
  logoutSession,
  MemberNames,
  MonthSummary,
  ReceiptRecord,
  SessionState,
  updateReceiptItemAssignments,
} from "./api";

const DEFAULT_MEMBERS: MemberNames = {
  user_1: "Member One",
  user_2: "Member Two",
};

function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function MonthCard({
  title,
  summary,
  currency,
  members,
}: {
  title: string;
  summary: MonthSummary;
  currency: string;
  members: MemberNames;
}) {
  return (
    <div className="month-card">
      <h3>{title}</h3>
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

export default function App() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [createHouseholdName, setCreateHouseholdName] = useState("");
  const [createMemberOne, setCreateMemberOne] = useState("");
  const [createMemberTwo, setCreateMemberTwo] = useState("");
  const [createPasscode, setCreatePasscode] = useState("");

  const [joinHouseholdCode, setJoinHouseholdCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");

  const [sessionUserName, setSessionUserName] = useState<string | null>(null);
  const [sessionHouseholdName, setSessionHouseholdName] = useState<string | null>(null);
  const [sessionHouseholdCode, setSessionHouseholdCode] = useState<string | null>(null);
  const [sessionMembers, setSessionMembers] = useState<MemberNames | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<ReceiptRecord | null>(null);

  const [uploading, setUploading] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [savingItemAssignments, setSavingItemAssignments] = useState(false);
  const [error, setError] = useState("");

  const memberNames = dashboard?.members ?? sessionMembers ?? DEFAULT_MEMBERS;

  const displayCurrency = useMemo(() => {
    if (latestReceipt?.currency) return latestReceipt.currency;
    if (dashboard?.recent_receipts?.[0]?.currency) return dashboard.recent_receipts[0].currency;
    return "USD";
  }, [dashboard, latestReceipt]);

  const myNotification = useMemo(() => {
    if (!dashboard || !sessionUserName) return null;
    return dashboard.notifications.find((entry) => entry.user === sessionUserName) ?? null;
  }, [dashboard, sessionUserName]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(image);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [image]);

  useEffect(() => {
    void initializeSession();
  }, []);

  function applySessionState(session: SessionState) {
    setSessionUserName(session.user_name);
    setSessionHouseholdName(session.household_name);
    setSessionHouseholdCode(session.household_code);
    if (session.members) {
      setSessionMembers(session.members);
    }
  }

  async function initializeSession() {
    setCheckingSession(true);
    try {
      const session = await fetchSession();
      applySessionState(session);
      if (session.user_name) {
        await loadDashboard();
      }
    } catch (sessionError) {
      const message = sessionError instanceof Error ? sessionError.message : "Failed to check session.";
      setError(message);
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadDashboard() {
    setLoadingDashboard(true);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
      setSessionHouseholdCode(data.household_code);
      setSessionHouseholdName(data.household_name);
      setSessionUserName(data.current_user_name);
      setSessionMembers(data.members);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load dashboard.";
      setError(message);
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function handleCreateHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createHouseholdName.trim() || !createMemberOne.trim() || !createMemberTwo.trim() || !createPasscode.trim()) {
      setError("Fill all Create Household fields.");
      return;
    }

    setAuthLoading(true);
    setError("");
    try {
      const session = await createHouseholdSession({
        household_name: createHouseholdName.trim(),
        member_1_name: createMemberOne.trim(),
        member_2_name: createMemberTwo.trim(),
        passcode: createPasscode,
      });
      applySessionState(session);
      setJoinHouseholdCode(session.household_code ?? "");
      await loadDashboard();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create household.";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleJoinHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinHouseholdCode.trim() || !joinName.trim() || !joinPasscode.trim()) {
      setError("Fill all Join Household fields.");
      return;
    }

    setAuthLoading(true);
    setError("");
    try {
      const session = await loginSession(joinHouseholdCode.trim(), joinName.trim(), joinPasscode);
      applySessionState(session);
      await loadDashboard();
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : "Failed to join household.";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    setError("");
    try {
      await logoutSession();
      setSessionUserName(null);
      setSessionHouseholdName(null);
      setSessionHouseholdCode(null);
      setSessionMembers(null);
      setDashboard(null);
      setLatestReceipt(null);
      setImage(null);
      setJoinName("");
      setJoinPasscode("");
    } catch (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : "Failed to logout.";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionUserName) {
      setError("Sign in first.");
      return;
    }
    if (!image) {
      setError("Select a receipt image first.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const { receipt } = await analyzeReceipt(image);
      setLatestReceipt(receipt);
      setImage(null);
      await loadDashboard();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to process receipt.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.[0] || null);
  }

  function handleItemAssignmentChange(itemIndex: number, assignedTo: AssignedTo) {
    if (!latestReceipt) return;

    const nextItems = latestReceipt.items.map((item, idx) =>
      idx === itemIndex ? { ...item, assigned_to: assignedTo } : item
    );
    setLatestReceipt({
      ...latestReceipt,
      items: nextItems,
    });
  }

  async function handleSaveItemAssignments() {
    if (!latestReceipt) return;

    setSavingItemAssignments(true);
    setError("");
    try {
      const assignments = latestReceipt.items.map((item, idx) => ({
        index: idx,
        assigned_to: (item.assigned_to || "shared") as AssignedTo,
      }));
      const { receipt } = await updateReceiptItemAssignments(latestReceipt.id, assignments);
      setLatestReceipt(receipt);
      await loadDashboard();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save item assignments.";
      setError(message);
    } finally {
      setSavingItemAssignments(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="layout">
        <section className="card splash-card">
          <p>Preparing your shared expense space...</p>
        </section>
      </main>
    );
  }

  if (!sessionUserName) {
    return (
      <main className="layout home-layout">
        <section className="hero card">
          <div className="hero-content">
            <p className="kicker">Shared Wallet, No Friction</p>
            <h1>SplitSpark</h1>
            <p className="subtitle">
              Create a household session, share the code, and keep two-person expenses balanced in real time.
            </p>
            <div className="feature-row">
              <span>Create Household Session</span>
              <span>AI Receipt Parsing</span>
              <span>Live Settlement</span>
            </div>
          </div>
        </section>

        <section className="auth-grid">
          <form className="card auth-panel" onSubmit={handleCreateHousehold}>
            <h2>Create Household Session</h2>
            <label htmlFor="household-name">Household name</label>
            <input
              id="household-name"
              type="text"
              placeholder="e.g. Home Base"
              value={createHouseholdName}
              onChange={(event) => setCreateHouseholdName(event.target.value)}
            />

            <label htmlFor="member-one-name">Member one name</label>
            <input
              id="member-one-name"
              type="text"
              placeholder="e.g. Alex"
              value={createMemberOne}
              onChange={(event) => setCreateMemberOne(event.target.value)}
            />

            <label htmlFor="member-two-name">Member two name</label>
            <input
              id="member-two-name"
              type="text"
              placeholder="e.g. Jamie"
              value={createMemberTwo}
              onChange={(event) => setCreateMemberTwo(event.target.value)}
            />

            <label htmlFor="create-passcode">Passcode</label>
            <input
              id="create-passcode"
              type="password"
              placeholder="Create shared passcode"
              value={createPasscode}
              onChange={(event) => setCreatePasscode(event.target.value)}
            />

            <button type="submit" disabled={authLoading}>
              {authLoading ? "Creating..." : "Create session"}
            </button>
          </form>

          <form className="card auth-panel" onSubmit={handleJoinHousehold}>
            <h2>Join Existing Session</h2>
            <label htmlFor="join-household-code">Household code</label>
            <input
              id="join-household-code"
              type="text"
              placeholder="e.g. A1B2C3"
              value={joinHouseholdCode}
              onChange={(event) => setJoinHouseholdCode(event.target.value.toUpperCase())}
            />

            <label htmlFor="join-member-name">Your member name</label>
            <input
              id="join-member-name"
              type="text"
              placeholder="e.g. Jamie"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
            />

            <label htmlFor="join-passcode">Passcode</label>
            <input
              id="join-passcode"
              type="password"
              placeholder="Enter shared passcode"
              value={joinPasscode}
              onChange={(event) => setJoinPasscode(event.target.value)}
            />

            <button type="submit" disabled={authLoading}>
              {authLoading ? "Joining..." : "Join session"}
            </button>
          </form>
        </section>

        {error && (
          <section className="card">
            <p className="error">{error}</p>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="layout app-layout">
      <section className="card top-bar">
        <div className="header-row">
          <div>
            <p className="kicker">Welcome back</p>
            <h1>{sessionUserName}</h1>
            <p className="subtitle">
              {sessionHouseholdName || "Household"} | Code: <strong>{sessionHouseholdCode || "-"}</strong>
            </p>
          </div>
          <div className="header-actions">
            <span className="date-pill">Current date: {dashboard ? formatDate(dashboard.current_date) : "..."}</span>
            <button type="button" className="secondary-btn" onClick={() => void handleLogout()} disabled={authLoading}>
              Logout
            </button>
          </div>
        </div>
      </section>

      <section className="card upload-card">
        <h2>Upload New Receipt</h2>
        <p className="subtitle">Your receipt is saved into this household session automatically.</p>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="receipt-image" className="file-label">
            Receipt image
          </label>
          <input id="receipt-image" type="file" accept="image/*" onChange={handleImageChange} />

          <button type="submit" disabled={uploading}>
            {uploading ? "Analyzing..." : "Analyze + Save"}
          </button>
        </form>

        {previewUrl && <img src={previewUrl} alt="Receipt preview" className="preview" />}
        {error && <p className="error">{error}</p>}
      </section>

      {loadingDashboard && (
        <section className="card">
          <p>Refreshing your monthly summary...</p>
        </section>
      )}

      {dashboard && (
        <>
          <section className="card">
            <h2>Monthly Expenses</h2>
            <div className="month-grid">
              <MonthCard
                title="Current Month"
                summary={dashboard.current_month}
                currency={displayCurrency}
                members={memberNames}
              />
              <MonthCard
                title="Last Month"
                summary={dashboard.last_month}
                currency={displayCurrency}
                members={memberNames}
              />
            </div>
          </section>

          <section className="card settlement-card">
            <h2>Settlement</h2>
            <p className="settlement-message">{dashboard.settlement.message}</p>
            <strong className="settlement-amount">{formatMoney(dashboard.settlement.amount, displayCurrency)}</strong>
          </section>

          {myNotification && (
            <section className="card">
              <h2>Your Notification</h2>
              <div className="notification-item">
                <span>{myNotification.user}</span>
                <p>{myNotification.message}</p>
              </div>
            </section>
          )}

          <section className="card">
            <h2>Recent Receipts</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Vendor</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent_receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{formatDate(receipt.expense_date)}</td>
                      <td>{receipt.uploaded_by_name}</td>
                      <td>{receipt.vendor || "-"}</td>
                      <td>{formatMoney(receipt.total, receipt.currency || displayCurrency)}</td>
                      <td>
                        <button type="button" className="table-action-btn" onClick={() => setLatestReceipt(receipt)}>
                          Edit items
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {latestReceipt && (
        <section className="card">
          <div className="header-row">
            <h2>Receipt Item Split</h2>
            <button type="button" onClick={() => void handleSaveItemAssignments()} disabled={savingItemAssignments}>
              {savingItemAssignments ? "Saving..." : "Save item split"}
            </button>
          </div>
          <p className="subtitle">
            Mark items as shared or individual. Individual items count fully for the selected member.
          </p>
          <div className="totals-grid">
            <div>
              <span>Member</span>
              <strong>{latestReceipt.uploaded_by_name}</strong>
            </div>
            <div>
              <span>Vendor</span>
              <strong>{latestReceipt.vendor || "-"}</strong>
            </div>
            <div>
              <span>Date</span>
              <strong>{formatDate(latestReceipt.expense_date)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMoney(latestReceipt.total, latestReceipt.currency || displayCurrency)}</strong>
            </div>
          </div>
          <h3>Items</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                  <th>Split rule</th>
                </tr>
              </thead>
              <tbody>
                {latestReceipt.items.map((item, idx) => (
                  <tr key={`${item.name}-${idx}`}>
                    <td>{item.name}</td>
                    <td>{item.quantity ?? "-"}</td>
                    <td>{formatMoney(item.unit_price, latestReceipt.currency || displayCurrency)}</td>
                    <td>{formatMoney(item.total_price, latestReceipt.currency || displayCurrency)}</td>
                    <td>
                      <select
                        className="item-assignment"
                        value={(item.assigned_to || "shared") as AssignedTo}
                        onChange={(event) => handleItemAssignmentChange(idx, event.target.value as AssignedTo)}
                      >
                        <option value="shared">Shared (50/50)</option>
                        <option value="user_1">{memberNames.user_1} pays full</option>
                        <option value="user_2">{memberNames.user_2} pays full</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
