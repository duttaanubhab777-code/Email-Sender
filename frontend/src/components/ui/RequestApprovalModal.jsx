import { useState } from "react";
import Modal from "./Modal";
import { Callout } from "./Bits";
import { requestApproval } from "../../services/api";
import { useToast } from "../Toast";
import { ACTION_LABEL } from "../../lib/approvals";

// Admin যখন Super Admin এর permission ছাড়া extra কাজ করতে চায় — permission চাওয়ার ফর্ম
// payload: { action, target, targets?, targetLabel }
export default function RequestApprovalModal({
    open,
    payload,
    onClose,
    onSent
}) {
    const toast = useToast();
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    async function send() {
        setBusy(true);
        try {
            const body = { action: payload.action, reason: reason.trim() };
            if (payload.targets) body.targets = payload.targets;
            else body.target = payload.target;
            const approval = await requestApproval(body);
            toast.success("Request sent to the Super Admin");
            setReason("");
            onSent?.(approval);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (!payload) return null;
    return (
        <Modal
            open={open}
            onClose={onClose}
            busy={busy}
            title="Ask the Super Admin for permission"
            icon="shieldCheck"
            footer={
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={send}
                        disabled={busy}
                    >
                        {busy ? <span className="spin" /> : "Send request"}
                    </button>
                </>
            }
        >
            <Callout icon="info">
                <p>
                    <b>{ACTION_LABEL[payload.action]}</b> needs the Super
                    Admin's approval.
                </p>
                <p className="muted">
                    Target:{" "}
                    <span className="inline-code">
                        {payload.targetLabel || payload.target}
                    </span>
                </p>
            </Callout>
            <div className="field">
                <label className="label" htmlFor="ap-reason">
                    Reason <small>optional · max 300 characters</small>
                </label>
                <textarea
                    id="ap-reason"
                    className="textarea"
                    maxLength={300}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Tell the Super Admin why you need this."
                />
            </div>
            <p className="help">
                Once approved, the permission works one time and expires after
                30 minutes.
            </p>
        </Modal>
    );
}
