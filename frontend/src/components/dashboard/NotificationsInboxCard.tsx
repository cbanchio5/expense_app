import { DashboardNotification } from "../../api";

interface NotificationsInboxCardProps {
  notifications: DashboardNotification[];
}

export function NotificationsInboxCard({ notifications }: NotificationsInboxCardProps) {
  if (!notifications.length) {
    return (
      <section className="card">
        <h2>Inbox</h2>
        <p className="subtitle">No notifications yet.</p>
      </section>
    );
  }

  const unreadCount = notifications.filter((entry) => !entry.read).length;

  return (
    <section className="card inbox-card">
      <div className="inbox-header">
        <div>
          <p className="kicker">Notifications</p>
          <h2>Inbox</h2>
        </div>
        <span className="inbox-counter">
          {unreadCount} unread / {notifications.length} total
        </span>
      </div>

      <div className="inbox-list">
        {notifications.map((entry, index) => (
          <article key={`${entry.user}-${entry.message}-${index}`} className={entry.read ? "inbox-item read" : "inbox-item"}>
            <header>
              <strong>{entry.user}</strong>
              <span>{entry.read ? "Read" : "Unread"}</span>
            </header>
            <p>{entry.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
