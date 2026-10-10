import { useCallback, useEffect, useState } from "react";

// ৩০ সেকেন্ডের resend অপেক্ষার জন্য: endAt (ms) ধরে প্রতি সেকেন্ডে কমে
export default function useCooldown(initialSeconds = 0) {
    const [endAt, setEndAt] = useState(
        () => Date.now() + initialSeconds * 1000
    );
    const [left, setLeft] = useState(initialSeconds);

    useEffect(() => {
        const tick = () =>
            setLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [endAt]);

    const start = useCallback(
        seconds => setEndAt(Date.now() + seconds * 1000),
        []
    );
    return [left, start];
}
