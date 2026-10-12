import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import { sendTestPush } from "../services/api";
import {
    currentSubscription,
    disablePush,
    enablePush,
    needsInstall,
    pushSupported
} from "../lib/push";

// ফোন notification এর অবস্থা: supported / permission / on-off + চালু, বন্ধ, test
export default function usePush() {
    const toast = useToast();
    const [state, setState] = useState({
        ready: false,
        supported: pushSupported(),
        install: needsInstall(),
        permission: pushSupported() ? Notification.permission : "unsupported",
        subscribed: false
    });
    const [busy, setBusy] = useState(false);

    const read = useCallback(async () => {
        const supported = pushSupported();
        let subscribed = false;
        try {
            subscribed = supported && !!(await currentSubscription());
        } catch {
            /* ইগনোর */
        }
        setState({
            ready: true,
            supported,
            install: needsInstall(),
            permission: supported ? Notification.permission : "unsupported",
            subscribed
        });
    }, []);

    useEffect(() => {
        read();
        window.addEventListener("es:push-changed", read);
        return () => window.removeEventListener("es:push-changed", read);
    }, [read]);

    const enable = useCallback(async () => {
        setBusy(true);
        try {
            await enablePush();
            toast.success("Phone notifications are on.");
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
            read();
        }
    }, [toast, read]);

    const disable = useCallback(async () => {
        setBusy(true);
        try {
            await disablePush();
            toast.info("Phone notifications are off for this device.");
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
            read();
        }
    }, [toast, read]);

    const test = useCallback(async () => {
        setBusy(true);
        try {
            await sendTestPush();
            toast.success("Test sent. Check your notification bar.");
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    }, [toast]);

    return { ...state, busy, enable, disable, test };
}
