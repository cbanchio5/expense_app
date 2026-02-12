interface NotificationCardProps {
  user: string;
  message: string;
}

export function NotificationCard({ user, message }: NotificationCardProps) {
  return (
    <section className="card">
      <h2>Your Notification</h2>
      <div className="notification-item">
        <span>{user}</span>
        <p>{message}</p>
      </div>
    </section>
  );
}
