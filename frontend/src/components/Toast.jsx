import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className={`toast ${type === 'error' ? 'toast-error' : ''}`} data-testid="toast" role="status">
      {message}
    </div>
  );
}
