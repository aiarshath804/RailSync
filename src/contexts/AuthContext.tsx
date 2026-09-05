import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AuthUser, DemoAccount, UserRole } from "../types";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  demoAccounts: DemoAccount[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  loginAsDemoRole: (role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessDepartment: (dept: string) => boolean;
  authHeaders: Record<string, string>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "railsync_session_token";
const USER_STORAGE_KEY = "railsync_user_profile";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch demo accounts list from authoritative backend
  const fetchDemoAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/demo-accounts");
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS" && Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
          return data.accounts;
        }
      }
    } catch (err) {
      console.warn("[RailSync Auth] Failed to load demo accounts from backend:", err);
    }
    return [];
  }, []);

  // Validate and restore session on mount
  const validateSession = useCallback(async (authToken: string) => {
    try {
      const res = await fetch("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Session-Token": authToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS" && data.user) {
          setUser(data.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          return true;
        }
      }
      // If unauthorized or expired, invalidate local storage
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      return false;
    } catch (err) {
      console.error("[RailSync Auth] Error validating session:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      await fetchDemoAccounts();
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        await validateSession(currentToken);
      }
      if (mounted) {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [fetchDemoAccounts, validateSession]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS" && data.session_token && data.user) {
        setToken(data.session_token);
        setUser(data.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, data.session_token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return {
          success: false,
          error: data.error || "Authentication failed. Please verify credentials.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Network error while connecting to authentication gateway.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemoRole = async (role: UserRole) => {
    let accounts = demoAccounts;
    if (accounts.length === 0) {
      accounts = await fetchDemoAccounts();
    }
    const target = accounts.find((a) => a.role === role);
    if (!target || !target.password) {
      return false;
    }
    const res = await login(target.email, target.password);
    return res.success;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_token: token }),
        });
      }
    } catch (err) {
      console.warn("[RailSync Auth] Logout network warning:", err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role === "ADMINISTRATOR") return true;
      return Array.isArray(user.permissions) && user.permissions.includes(permission);
    },
    [user]
  );

  const canAccessDepartment = useCallback(
    (dept: string): boolean => {
      if (!user) return false;
      if (user.role === "ADMINISTRATOR") return true;
      const uDept = (user.department || "").toUpperCase();
      const targetDept = (dept || "").toUpperCase();
      if (uDept === "ALL" || uDept === targetDept) return true;
      if (user.role === "OPERATIONS_CONTROLLER") return true; // Traffic controller coordinates all departments
      return false;
    },
    [user]
  );

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
    };
  }, [token]);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) return;
    await validateSession(token);
  }, [token, validateSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        demoAccounts,
        login,
        loginAsDemoRole,
        logout,
        hasPermission,
        canAccessDepartment,
        authHeaders,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
