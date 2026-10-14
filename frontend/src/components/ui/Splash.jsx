import { useEffect, useState } from "react";
import logoMark from "../../assets/logo-mark.png";

const STEPS = [
    "Starting Email Sender…",
    "Securing your session…",
    "Loading your workspace…",
    "Almost there…"
];

// পুরো স্ক্রিনের অ্যানিমেটেড লোডার: ঘুরন্ত রিং + কক্ষপথে ঘোরা বিন্দু + উড়ন্ত প্লেন + প্রগ্রেস বার।
// Render-এর ফ্রি সার্ভার ঘুমিয়ে থাকলে জাগতে দেরি হয়, তাই ৬ সেকেন্ডের বেশি লাগলে একটা হিন্ট দেখায়।
export default function Splash({ text }) {
    const [step, setStep] = useState(0);
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        const a = setInterval(
            () => setStep(s => (s + 1) % STEPS.length),
            1700
        );
        const b = setTimeout(() => setSlow(true), 6000);
        return () => {
            clearInterval(a);
            clearTimeout(b);
        };
    }, []);

    return (
        <>
            <div className="splash2" role="status" aria-live="polite">
                <div>
                    <div className="sp-stage">
                        <span className="sp-ring r3" />
                        <span className="sp-ring r1" />
                        <span className="sp-ring r2" />
                        <span className="sp-pulse" />
                        <span className="sp-orbit">
                            <i />
                        </span>
                        <span className="sp-orbit o2">
                            <i />
                        </span>
                        <span className="sp-plane" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M2.5 11.2 21 3.4c.8-.3 1.5.4 1.2 1.2l-7.8 18.5c-.4.9-1.7.9-2 0l-2.3-6.6-6.6-2.3c-.9-.3-.9-1.6 0-2z" />
                            </svg>
                        </span>
                        <img
                            className="sp-logo"
                            src={logoMark}
                            alt="Email Sender"
                            draggable="false"
                        />
                    </div>
                    <h2 className="sp-title">
                        Email<b>Sender</b>
                    </h2>
                    <div className="sp-bar">
                        <i />
                    </div>
                    <p className="sp-text" key={text || step}>
                        {text || STEPS[step]}
                    </p>
                    <div className="sp-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                    </div>
                    {slow && (
                        <p className="sp-hint">
                            The server is waking up. This can take up to a
                            minute on the first visit — please hold on.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
