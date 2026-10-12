import { useCallback, useEffect, useState } from "react";
import {
    canPromptInstall,
    isIOSDevice,
    isStandaloneApp,
    promptInstall,
    subscribeInstall
} from "../lib/pwa";

// অ্যাপ install এর অবস্থা: install করা আছে? এক ট্যাপে করা যাবে? iPhone এ হাতে করতে হবে?
export default function useInstall() {
    const read = () => ({
        installed: isStandaloneApp(),
        canInstall: canPromptInstall(),
        ios: isIOSDevice() && !isStandaloneApp()
    });
    const [state, setState] = useState(read);

    useEffect(() => {
        const update = () => setState(read());
        const off = subscribeInstall(update);
        const mq = window.matchMedia?.("(display-mode: standalone)");
        mq?.addEventListener?.("change", update);
        return () => {
            off();
            mq?.removeEventListener?.("change", update);
        };
    }, []);

    const install = useCallback(async () => {
        const outcome = await promptInstall();
        setState(read());
        return outcome;
    }, []);

    return { ...state, install };
}
