export default function Modal({ title, children, onClose, testid }) {
  return (
    <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} data-testid={testid}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
