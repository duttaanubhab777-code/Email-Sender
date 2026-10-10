import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import { getCurrentUser, loginUser, logoutUser } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [justLoggedOut, setJustLoggedOut] = useState(false);

    // app খুললে cookie দেখে বুঝে নেয় লগইন আছে কিনা
    useEffect(() => {
        let ignore = false;
        getCurrentUser()
            .then(u => {
                if (!ignore) setUser(u);
            })
            .catch(() => {
                if (!ignore) setUser(null);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
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
