import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import { getCurrentUser, loginUser, logoutUser } from "../services/api";
import { detachDevice } from "../lib/push";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [justLoggedOut, setJustLoggedOut] = useState(false);

    // app খুললে cookie দেখে বুঝে নেয় লগইন আছে কিনা।
    // BUG FIX: আগে যেকোনো error (network, Render cold start 502/503) এ user = null করে login পেজে পাঠানো হত।
    // এখন শুধু server স্পষ্টভাবে 401/403 বললেই logout; বাকি ক্ষেত্রে অপেক্ষা করে আবার চেষ্টা (Splash দেখায় "server waking up")।
    useEffect(() => {
        let ignore = false;
        (async () => {
            for (let attempt = 0; attempt < 6; attempt++) {
                try {
                    const u = await getCurrentUser();
                    if (!ignore) setUser(u);
                    break;
                } catch (err) {
                    if (ignore) return;
                    // 4xx = server স্পষ্ট বলেছে "লগইন নেই" → logout।
                    // 5xx / network / 503 (server waking up) = session নষ্ট হয়নি → অপেক্ষা করে আবার চেষ্টা।
                    const definite = err?.status >= 400 && err.status < 500;
                    if (definite || attempt === 5) {
                        setUser(null);
                        break;
                    }
                    await new Promise(r => setTimeout(r, 4000));
                }
            }
            if (!ignore) setLoading(false);
        })();
        return () => {
            ignore = true;
        };
    }, []);

    const signIn = useCallback(u => {
        setJustLoggedOut(false);
        setUser(u);
    }, []);

    const login = useCallback(
        async (identifier, password) => {
            const data = await loginUser(identifier, password);
            signIn(data.user);
            return data.user;
        },
        [signIn]
    );

    const logout = useCallback(async () => {
        try {
            // এই ফোন থেকে এই ইউজারের notification বন্ধ (লগআউটের পর আর আসবে না)
            await detachDevice();
            await logoutUser();
        } finally {
            setJustLoggedOut(true);
            setUser(null);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        const u = await getCurrentUser();
        setUser(u);
        return u;
    }, []);

    const value = useMemo(
        () => ({
            user,
            setUser,
            loading,
            login,
            logout,
            signIn,
            refreshUser,
            justLoggedOut
        }),
        [user, loading, login, logout, signIn, refreshUser, justLoggedOut]
    );
    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
