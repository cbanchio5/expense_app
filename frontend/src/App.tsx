import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AssignedTo,
  analyzeReceipt,
  createManualExpense,
  createHouseholdSession,
  DashboardData,
  fetchDashboard,
  fetchReceiptAnalyses,
  fetchSession,
  loginSession,
  logoutSession,
  MemberNames,
  ReceiptRecord,
  settleHousehold,
  SessionState,
  updateReceiptItemAssignments,
} from "./api";
import { MonthlyExpensesSection } from "./components/dashboard/MonthlyExpensesSection";
import { ManualExpenseCard } from "./components/dashboard/ManualExpenseCard";
import { NotificationsInboxCard } from "./components/dashboard/NotificationsInboxCard";
import { ReceiptAnalysesCard } from "./components/dashboard/ReceiptAnalysesCard";
import { ReceiptItemSplitCard } from "./components/dashboard/ReceiptItemSplitCard";
import { RecentReceiptsCard } from "./components/dashboard/RecentReceiptsCard";
import { SettlementCard } from "./components/dashboard/SettlementCard";
import { TopBar } from "./components/dashboard/TopBar";
import { UploadReceiptCard } from "./components/dashboard/UploadReceiptCard";
import { CreateHouseholdForm } from "./components/home/CreateHouseholdForm";
import { HomeHero } from "./components/home/HomeHero";
import { JoinHouseholdForm } from "./components/home/JoinHouseholdForm";
import { toUserErrorMessage } from "./utils/errors";
import { formatDate } from "./utils/formatters";

const DEFAULT_MEMBERS: MemberNames = {
  user_1: "Member One",
  user_2: "Member Two",
};
const CURRENCY_OPTIONS = [
  { code: "USD", label: "USD - $ US Dollar" },
  { code: "EUR", label: "EUR - € Euro" },
  { code: "GBP", label: "GBP - £ British Pound" },
  { code: "CAD", label: "CAD - C$ Canadian Dollar" },
  { code: "MXN", label: "MXN - $ Mexican Peso" },
  { code: "BRL", label: "BRL - R$ Brazilian Real" },
  { code: "JPY", label: "JPY - ¥ Japanese Yen" },
  { code: "CHF", label: "CHF - Fr Swiss Franc" },
  { code: "AUD", label: "AUD - A$ Australian Dollar" },
  { code: "INR", label: "INR - Rs Indian Rupee" },
];
const CURRENCY_CODES = CURRENCY_OPTIONS.map((option) => option.code);
const CURRENCY_PREFERENCE_KEY = "splithappens_currency_preference";

type AppRoute = "dashboard" | "analyses" | "notifications";
type AuthMode = "create" | "join";

function routeFromPath(pathname: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/notifications") return "notifications";
  return normalizedPath === "/analyses" ? "analyses" : "dashboard";
}

export default function App() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [createHouseholdName, setCreateHouseholdName] = useState("");
  const [createMemberOne, setCreateMemberOne] = useState("");
  const [createMemberTwo, setCreateMemberTwo] = useState("");
  const [createPasscode, setCreatePasscode] = useState("");

  const [joinHouseholdName, setJoinHouseholdName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [manualVendor, setManualVendor] = useState("");
  const [manualTotal, setManualTotal] = useState("");
  const [manualExpenseDate, setManualExpenseDate] = useState("");
  const [manualCurrency, setManualCurrency] = useState(() => {
    if (typeof window === "undefined") return "USD";
    const stored = window.localStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (stored && CURRENCY_CODES.includes(stored)) {
      return stored;
    }
    return "USD";
  });
  const [manualNotes, setManualNotes] = useState("");

  const [sessionUserName, setSessionUserName] = useState<string | null>(null);
  const [sessionHouseholdName, setSessionHouseholdName] = useState<string | null>(null);
  const [sessionHouseholdCode, setSessionHouseholdCode] = useState<string | null>(null);
  const [sessionMembers, setSessionMembers] = useState<MemberNames | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analyses, setAnalyses] = useState<ReceiptRecord[]>([]);
  const [latestReceipt, setLatestReceipt] = useState<ReceiptRecord | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));
  const [authMode, setAuthMode] = useState<AuthMode>("create");

  const [uploading, setUploading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [savingManualExpense, setSavingManualExpense] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [savingItemAssignments, setSavingItemAssignments] = useState(false);
  const [error, setError] = useState("");

  function showError(errorValue: unknown, fallback: string) {
    setError(toUserErrorMessage(errorValue, fallback));
  }

  const memberNames = dashboard?.members ?? sessionMembers ?? DEFAULT_MEMBERS;

  const displayCurrency = useMemo(() => {
    if (latestReceipt?.currency) return latestReceipt.currency;
    if (dashboard?.recent_receipts?.[0]?.currency) return dashboard.recent_receipts[0].currency;
    if (analyses[0]?.currency) return analyses[0].currency;
    return "USD";
  }, [analyses, dashboard, latestReceipt]);

  const unreadNotificationCount = useMemo(
    () => dashboard?.notifications.filter((entry) => !entry.read).length ?? 0,
    [dashboard]
  );
  const currentDateLabel = useMemo(() => {
    if (dashboard?.current_date) {
      return formatDate(dashboard.current_date);
    }
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }, [dashboard?.current_date]);

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENCY_PREFERENCE_KEY, manualCurrency);
  }, [manualCurrency]);

  useEffect(() => {
    void initializeSession();
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (sessionUserName && route === "analyses") {
      void loadAnalyses();
    }
  }, [route, sessionUserName]);

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
      showError(sessionError, "Failed to check session.");
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
      showError(loadError, "Failed to load dashboard.");
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function loadAnalyses() {
    setLoadingAnalyses(true);
    try {
      const data = await fetchReceiptAnalyses();
      setAnalyses(data.analyses);
    } catch (loadError) {
      showError(loadError, "Failed to load analyses.");
    } finally {
      setLoadingAnalyses(false);
    }
  }

  function navigateTo(nextRoute: AppRoute) {
    let nextPath = "/";
    if (nextRoute === "analyses") nextPath = "/analyses";
    if (nextRoute === "notifications") nextPath = "/notifications";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setRoute(nextRoute);
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
      setJoinHouseholdName(session.household_name ?? "");
      await loadDashboard();
    } catch (createError) {
      showError(createError, "Failed to create household.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleJoinHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinHouseholdName.trim() || !joinName.trim() || !joinPasscode.trim()) {
      setError("Fill all Join Household fields.");
      return;
    }

    setAuthLoading(true);
    setError("");
    try {
      const session = await loginSession(joinHouseholdName.trim(), joinName.trim(), joinPasscode);
      applySessionState(session);
      await loadDashboard();
    } catch (joinError) {
      showError(joinError, "Failed to join household.");
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
      setAnalyses([]);
      setLatestReceipt(null);
      setImage(null);
      setJoinHouseholdName("");
      setJoinName("");
      setJoinPasscode("");
      navigateTo("dashboard");
    } catch (logoutError) {
      showError(logoutError, "Failed to logout.");
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
      navigateTo("dashboard");
      if (route === "analyses") {
        await loadAnalyses();
      }
    } catch (submitError) {
      showError(submitError, "Unable to process receipt.");
    } finally {
      setUploading(false);
    }
  }

  async function handleManualExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionUserName) {
      setError("Sign in first.");
      return;
    }

    const parsedTotal = Number(manualTotal);
    if (!manualTotal || Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      setError("Enter a valid manual expense total.");
      return;
    }

    setSavingManualExpense(true);
    setError("");
    try {
      await createManualExpense({
        vendor: manualVendor.trim(),
        total: parsedTotal,
        expense_date: manualExpenseDate || undefined,
        currency: manualCurrency.trim().toUpperCase() || "USD",
        notes: manualNotes.trim(),
      });
      setManualVendor("");
      setManualTotal("");
      setManualExpenseDate("");
      setManualNotes("");
      await loadDashboard();
      if (route === "analyses") {
        await loadAnalyses();
      }
    } catch (manualError) {
      showError(manualError, "Failed to save manual expense.");
    } finally {
      setSavingManualExpense(false);
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
      await updateReceiptItemAssignments(latestReceipt.id, assignments);
      setLatestReceipt(null);
      await loadDashboard();
      if (route === "analyses") {
        await loadAnalyses();
      }
    } catch (saveError) {
      showError(saveError, "Failed to save item assignments.");
    } finally {
      setSavingItemAssignments(false);
    }
  }

  async function handleSettle() {
    if (!dashboard) return;

    setSettling(true);
    setError("");
    try {
      await settleHousehold();
      await loadDashboard();
      if (route === "analyses") {
        await loadAnalyses();
      }
    } catch (settleError) {
      showError(settleError, "Failed to settle household.");
    } finally {
      setSettling(false);
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
        <HomeHero />

        <section className="card auth-shell">
          <div className="auth-mode-row">
            <button
              type="button"
              className={authMode === "create" ? "auth-mode-btn is-active" : "auth-mode-btn"}
              onClick={() => setAuthMode("create")}
            >
              Create household
            </button>
            <button
              type="button"
              className={authMode === "join" ? "auth-mode-btn is-active" : "auth-mode-btn"}
              onClick={() => setAuthMode("join")}
            >
              Join existing
            </button>
          </div>

          {authMode === "create" ? (
            <CreateHouseholdForm
              householdName={createHouseholdName}
              memberOne={createMemberOne}
              memberTwo={createMemberTwo}
              passcode={createPasscode}
              authLoading={authLoading}
              onSubmit={handleCreateHousehold}
              onHouseholdNameChange={setCreateHouseholdName}
              onMemberOneChange={setCreateMemberOne}
              onMemberTwoChange={setCreateMemberTwo}
              onPasscodeChange={setCreatePasscode}
            />
          ) : (
            <JoinHouseholdForm
              householdName={joinHouseholdName}
              name={joinName}
              passcode={joinPasscode}
              authLoading={authLoading}
              onSubmit={handleJoinHousehold}
              onHouseholdNameChange={setJoinHouseholdName}
              onNameChange={setJoinName}
              onPasscodeChange={setJoinPasscode}
            />
          )}
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
      <TopBar
        sessionUserName={sessionUserName}
        sessionHouseholdName={sessionHouseholdName}
        sessionHouseholdCode={sessionHouseholdCode}
        currentDateLabel={currentDateLabel}
        unreadNotificationCount={unreadNotificationCount}
        authLoading={authLoading}
        route={route}
        onNavigateToNotifications={() => navigateTo("notifications")}
        isAnalysesRoute={route === "analyses"}
        onNavigateToAnalyses={() => navigateTo("analyses")}
        onNavigateToDashboard={() => navigateTo("dashboard")}
        onLogout={() => void handleLogout()}
      />

      {route === "dashboard" && loadingDashboard && (
        <section className="card">
          <p>Refreshing your monthly summary...</p>
        </section>
      )}

      {route === "dashboard" && dashboard && (
        <MonthlyExpensesSection dashboard={dashboard} displayCurrency={displayCurrency} members={memberNames} />
      )}

      {route === "dashboard" && (
        <section className="entry-grid">
          <UploadReceiptCard
            uploading={uploading}
            previewUrl={previewUrl}
            error={error}
            onSubmit={handleSubmit}
            onImageChange={handleImageChange}
          />
          <ManualExpenseCard
            vendor={manualVendor}
            total={manualTotal}
            expenseDate={manualExpenseDate}
            currency={manualCurrency}
            currencyOptions={CURRENCY_OPTIONS}
            notes={manualNotes}
            saving={savingManualExpense}
            error={error}
            onSubmit={handleManualExpenseSubmit}
            onVendorChange={setManualVendor}
            onTotalChange={setManualTotal}
            onExpenseDateChange={setManualExpenseDate}
            onCurrencyChange={setManualCurrency}
            onNotesChange={setManualNotes}
          />
        </section>
      )}

      {route === "dashboard" && dashboard && (
        <>
          <SettlementCard
            message={dashboard.settlement.message}
            amount={dashboard.settlement.amount}
            currency={displayCurrency}
            settling={settling}
            onSettle={() => void handleSettle()}
          />

          <RecentReceiptsCard
            receipts={dashboard.recent_receipts}
            displayCurrency={displayCurrency}
            onEditReceipt={setLatestReceipt}
          />
        </>
      )}

      {route === "analyses" && (
        <>
          {loadingAnalyses && (
            <section className="card">
              <p>Loading all analyzed receipts...</p>
            </section>
          )}

          {!loadingAnalyses && (
            <ReceiptAnalysesCard receipts={analyses} displayCurrency={displayCurrency} onEditReceipt={setLatestReceipt} />
          )}
        </>
      )}

      {route === "notifications" && dashboard && (
        <NotificationsInboxCard notifications={dashboard.notifications} />
      )}

      {latestReceipt && (
        <ReceiptItemSplitCard
          receipt={latestReceipt}
          members={memberNames}
          displayCurrency={displayCurrency}
          savingItemAssignments={savingItemAssignments}
          onSave={() => void handleSaveItemAssignments()}
          onAssignmentChange={handleItemAssignmentChange}
        />
      )}
    </main>
  );
}
