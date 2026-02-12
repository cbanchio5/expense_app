interface TopBarProps {
  sessionUserName: string;
  sessionHouseholdName: string | null;
  sessionHouseholdCode: string | null;
  currentDateLabel: string;
  authLoading: boolean;
  onLogout: () => void;
}

export function TopBar({
  sessionUserName,
  sessionHouseholdName,
  sessionHouseholdCode,
  currentDateLabel,
  authLoading,
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
          <button type="button" className="secondary-btn" onClick={onLogout} disabled={authLoading}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
}
