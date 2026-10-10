import Modal from "./Modal";

export default function ConfirmModal({
    open,
    title,
    text,
    confirmLabel = "Confirm",
    danger = false,
    busy = false,
    onConfirm,
    onCancel,
    children
}) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            busy={busy}
            title={title}
            icon={danger ? "trash" : "alert"}
            tone={danger ? "danger" : ""}
            footer={
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? <span className="spin" /> : confirmLabel}
                    </button>
                </>
            }
        >
            {text && <p>{text}</p>}
            {children}
        </Modal>
    );
}
