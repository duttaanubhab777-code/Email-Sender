import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSystemStatus } from "../services/api";

// Kill switch চালু হলে (পোলিং বা 503 পেলে) যেকোনো পেজ থেকে /system/status এ পাঠায়
export default function SystemWatcher() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const pathRef = useRef(pathname);
    pathRef.current = pathname;

    useEffect(() => {
        const go = () => {
            if (!pathRef.current.startsWith("/system/status"))
                navigate("/system/status", { replace: true });
        };
        const check = async () => {
            if (document.hidden) return;
            try {
                const s = await getSystemStatus();
                if (s?.active) go();
            } catch {
                /* সার্ভার নেই — চুপ */
            }
        };
        check();
        const id = setInterval(check, 15000);
        window.addEventListener("es:kill", go);
        return () => {
            clearInterval(id);
            window.removeEventListener("es:kill", go);
        };
    }, [navigate]);

    return null;
}
