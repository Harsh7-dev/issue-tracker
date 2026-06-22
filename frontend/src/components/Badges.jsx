export function StatusBadge({ status }) {
  const label = { TODO: 'Todo', IN_PROGRESS: 'In Progress', DONE: 'Done' }[status] || status;
  return <span className="badge badge-status" data-status={status} data-testid="status-badge">{label}</span>;
}

export function PriorityTag({ priority }) {
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();
  return <span className={`prio-dot prio-${priority}`} data-testid="priority-tag">{label}</span>;
}
