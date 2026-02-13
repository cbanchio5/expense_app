import { useEffect, useState } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [route]);

  function handleNavAction(action: () => void) {
    setIsMenuOpen(false);
    action();
  }

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
            className={isMenuOpen ? "menu-toggle is-open" : "menu-toggle"}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle dashboard menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div className={isMenuOpen ? "header-nav is-open" : "header-nav"}>
            <button
              type="button"
              className={route === "dashboard" ? "secondary-btn is-active" : "secondary-btn"}
              onClick={() => handleNavAction(onNavigateToDashboard)}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={isAnalysesRoute ? "secondary-btn is-active" : "secondary-btn"}
              onClick={() => handleNavAction(onNavigateToAnalyses)}
            >
              All receipt analyses
            </button>
            <button
              type="button"
              className={route === "notifications" ? "secondary-btn is-active" : "secondary-btn"}
              onClick={() => handleNavAction(onNavigateToNotifications)}
            >
              Inbox ({unreadNotificationCount})
            </button>
            <button type="button" className="secondary-btn" onClick={() => handleNavAction(onLogout)} disabled={authLoading}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
