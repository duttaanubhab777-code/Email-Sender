import { useState } from "react";
import { resendOtp } from "../../services/api";
import { useToast } from "../../components/Toast";
import OtpInput from "../../components/ui/OtpInput";
import useCooldown from "../../hooks/useCooldown";
import { savePending, secondsLeft } from "../../lib/pending";

// Register verify আর Reset password — দুই জায়গার OTP অংশ একই
export default function OtpStep({
    pending,
    otp,
    setOtp,
    bad,
    onComplete,
    disabled
}) {
    const toast = useToast();
    const [left, startCooldown] = useCooldown(secondsLeft(pending.resendUntil));
    const [sending, setSending] = useState(false);

    async function resend() {
        setSending(true);
        try {
            const d = await resendOtp(pending.purpose, pending.email);
            const secs = d?.resendAfterSeconds ?? 30;
            startCooldown(secs);
            savePending({ ...pending, resendUntil: Date.now() + secs * 1000 });
            setOtp("");
            toast.success("A new code has been sent");
        } catch (err) {
            if (err.retryAfter) startCooldown(err.retryAfter);
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <OtpInput
                value={otp}
                onChange={setOtp}
                bad={bad}
                disabled={disabled}
                onComplete={onComplete}
            />
            <div className="center help" style={{ marginTop: 4 }}>
                {left > 0 ? (
                    <>
                        Resend code in <b className="mono">{left}s</b>
                    </>
                ) : (
                    <>
                        Didn't get the code?{" "}
                        <button
                            type="button"
                            className="link"
                            onClick={resend}
                            disabled={sending}
                        >
                            {sending ? "Sending…" : "Resend code"}
                        </button>
                    </>
                )}
            </div>
        </>
    );
}
