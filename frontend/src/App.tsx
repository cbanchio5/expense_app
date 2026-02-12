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
  SessionState,
  updateReceiptItemAssignments,
} from "./api";
import { MonthlyExpensesSection } from "./components/dashboard/MonthlyExpensesSection";
import { ManualExpenseCard } from "./components/dashboard/ManualExpenseCard";
import { NotificationCard } from "./components/dashboard/NotificationCard";
import { ReceiptAnalysesCard } from "./components/dashboard/ReceiptAnalysesCard";
import { ReceiptItemSplitCard } from "./components/dashboard/ReceiptItemSplitCard";
import { RecentReceiptsCard } from "./components/dashboard/RecentReceiptsCard";
import { SettlementCard } from "./components/dashboard/SettlementCard";
import { TopBar } from "./components/dashboard/TopBar";
import { UploadReceiptCard } from "./components/dashboard/UploadReceiptCard";
import { CreateHouseholdForm } from "./components/home/CreateHouseholdForm";
import { HomeHero } from "./components/home/HomeHero";
import { JoinHouseholdForm } from "./components/home/JoinHouseholdForm";
import { formatDate } from "./utils/formatters";

const DEFAULT_MEMBERS: MemberNames = {
  user_1: "Member One",
  user_2: "Member Two",
};

type AppRoute = "dashboard" | "analyses";

function routeFromPath(pathname: string): AppRoute {
  return pathname === "/analyses" ? "analyses" : "dashboard";
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
  const [manualVendor, setManualVendor] = useState("");
  const [manualTotal, setManualTotal] = useState("");
  const [manualExpenseDate, setManualExpenseDate] = useState("");
  const [manualCurrency, setManualCurrency] = useState("USD");
  const [manualNotes, setManualNotes] = useState("");

  const [sessionUserName, setSessionUserName] = useState<string | null>(null);
  const [sessionHouseholdName, setSessionHouseholdName] = useState<string | null>(null);
  const [sessionHouseholdCode, setSessionHouseholdCode] = useState<string | null>(null);
  const [sessionMembers, setSessionMembers] = useState<MemberNames | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analyses, setAnalyses] = useState<ReceiptRecord[]>([]);
  const [latestReceipt, setLatestReceipt] = useState<ReceiptRecord | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));

  const [uploading, setUploading] = useState(false);
  const [savingManualExpense, setSavingManualExpense] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [savingItemAssignments, setSavingItemAssignments] = useState(false);
  const [error, setError] = useState("");

  const memberNames = dashboard?.members ?? sessionMembers ?? DEFAULT_MEMBERS;

  const displayCurrency = useMemo(() => {
    if (latestReceipt?.currency) return latestReceipt.currency;
    if (dashboard?.recent_receipts?.[0]?.currency) return dashboard.recent_receipts[0].currency;
    if (analyses[0]?.currency) return analyses[0].currency;
    return "USD";
  }, [analyses, dashboard, latestReceipt]);

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

  async function loadAnalyses() {
    setLoadingAnalyses(true);
    try {
      const data = await fetchReceiptAnalyses();
      setAnalyses(data.analyses);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load analyses.";
      setError(message);
    } finally {
      setLoadingAnalyses(false);
    }
  }

  function navigateTo(nextRoute: AppRoute) {
    const nextPath = nextRoute === "analyses" ? "/analyses" : "/";
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
      setAnalyses([]);
      setLatestReceipt(null);
      setImage(null);
      setJoinName("");
      setJoinPasscode("");
      navigateTo("dashboard");
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
      navigateTo("dashboard");
      if (route === "analyses") {
        await loadAnalyses();
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to process receipt.";
      setError(message);
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
      const message = manualError instanceof Error ? manualError.message : "Failed to save manual expense.";
      setError(message);
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
        <HomeHero />

        <section className="auth-grid">
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
          <JoinHouseholdForm
            householdCode={joinHouseholdCode}
            name={joinName}
            passcode={joinPasscode}
            authLoading={authLoading}
            onSubmit={handleJoinHousehold}
            onHouseholdCodeChange={(value) => setJoinHouseholdCode(value.toUpperCase())}
            onNameChange={setJoinName}
            onPasscodeChange={setJoinPasscode}
          />
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
        currentDateLabel={dashboard ? formatDate(dashboard.current_date) : "..."}
        authLoading={authLoading}
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
          />

          {myNotification && (
            <NotificationCard user={myNotification.user} message={myNotification.message} />
          )}
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
