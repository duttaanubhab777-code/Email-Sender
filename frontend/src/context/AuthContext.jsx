import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { getCurrentUser, loginUser, logoutUser } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // শুরুতে true থাকবে

  // অ্যাপ খুললেঃ কুকি থেকে বুঝে নাও ইউজার লগইন আছে কি না
  useEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then((u) => { if (!ignore) setUser(u); })
      .catch(() => { if (!ignore) setUser(null); })
      .finally(() => { if (!ignore) setLoading(false); });
    
    return () => { ignore = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { 
      await logoutUser(); 
    } finally { 
      setUser(null); 
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth অবশ্যই <AuthProvider>-এর ভেতরে ব্যবহার করতে হবে");
  return ctx;
}