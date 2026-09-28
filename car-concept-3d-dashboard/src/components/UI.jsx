import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export function Button({
  to,
  secondary = false,
  children,
  className = "",
  ...props
}) {
  const classes = `button ${secondary ? "button--secondary" : ""} ${className}`;
  return to ? (
    <Link to={to} className={classes} {...props}>
      {children}
    </Link>
  ) : (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
export function SearchInput(props) {
  return (
    <input
      className="search"
      type="search"
      aria-label="Search"
      placeholder="Search the collection"
      {...props}
    />
  );
}
export function FormField({ label, error, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error && (
        <small className="error-text">
          {Array.isArray(error) ? error.join(" ") : String(error)}
        </small>
      )}
    </label>
  );
}
export function StateView({
  loading,
  error,
  retry,
  empty = "Nothing here yet.",
}) {
  return (
    <div
      className={`state-view ${error ? "state-view--error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <span className="eyebrow">
        {loading
          ? "Auto Anatomy"
          : error?.status === 404
            ? "Not found"
            : error
              ? "Connection unavailable"
              : "Collection"}
      </span>
      <h2>
        {loading ? "Opening the archive…" : error ? error.message : empty}
      </h2>
      {loading && <span className="loading-line" />}
      {error && retry && (
        <Button secondary onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ConfirmDialog({ record, pending, error, onConfirm, onClose }) {
  return (
    <Modal title="Delete this record?" onClose={onClose}>
      <p>
        Deleting “{record.name || record.component_id || `record ${record.id}`}”
        is permanent. Related records may also be deleted. Deleting a database
        component does not alter the GLB or its semantic IDs.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error.message}
        </p>
      )}
      <div className="actions">
        <Button secondary onClick={onClose} disabled={pending}>
          Keep record
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? "Deleting…" : "Delete record"}
        </Button>
      </div>
    </Modal>
  );
}
export function Pagination({ payload, page, setPage }) {
  return payload?.next || payload?.previous ? (
    <div className="pagination">
      <Button
        secondary
        disabled={!payload.previous}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>
      <span>Page {page}</span>
      <Button
        secondary
        disabled={!payload.next}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  ) : null;
}
