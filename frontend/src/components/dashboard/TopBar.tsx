interface TopBarProps {
  sessionUserName: string;
  sessionHouseholdName: string | null;
  sessionHouseholdCode: string | null;
  currentDateLabel: string;
  unreadNotificationCount: number;
  authLoading: boolean;
  route: "dashboard" | "analyses" | "notifications";
  onNavigateToNotifications: () => void;
  isAnalysesRoute: boolean;
  onNavigateToAnalyses: () => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
}

export function TopBar({
  sessionUserName,
  sessionHouseholdName,
  sessionHouseholdCode,
  currentDateLabel,
  unreadNotificationCount,
  authLoading,
  route,
  onNavigateToNotifications,
  isAnalysesRoute,
  onNavigateToAnalyses,
  onNavigateToDashboard,
  onLogout,
}: TopBarProps) {
  return (
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
          <span className="date-pill">Current date: {currentDateLabel}</span>
          <button
            type="button"
            className={route === "dashboard" ? "secondary-btn is-active" : "secondary-btn"}
            onClick={onNavigateToDashboard}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={isAnalysesRoute ? "secondary-btn is-active" : "secondary-btn"}
            onClick={onNavigateToAnalyses}
          >
            All receipt analyses
          </button>
          <button
            type="button"
            className={route === "notifications" ? "secondary-btn is-active" : "secondary-btn"}
            onClick={onNavigateToNotifications}
          >
            Inbox ({unreadNotificationCount})
          </button>
          <button type="button" className="secondary-btn" onClick={onLogout} disabled={authLoading}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
}
