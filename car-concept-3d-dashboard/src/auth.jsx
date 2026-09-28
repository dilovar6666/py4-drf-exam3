import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, clearTokens, getAccessToken } from "./api.js";
import { useLanguage } from "./i18n.js";

const AuthContext = createContext({ status: "checking", user: null });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: getAccessToken() ? "checking" : "guest", user: null });
  useEffect(() => {
    let generation = 0;
    function refresh() {
      const current = ++generation;
      if (!getAccessToken()) { setAuth({ status: "guest", user: null }); return; }
      setAuth((previous) => ({ status: "checking", user: previous.user }));
      api.profile().then((user) => { if (current === generation) setAuth({ status: "authenticated", user }); })
        .catch(() => { if (current === generation) { clearTokens(); setAuth({ status: "guest", user: null }); } });
    }
    refresh();
    window.addEventListener("auto-anatomy:auth-changed", refresh);
    return () => { generation += 1; window.removeEventListener("auto-anatomy:auth-changed", refresh); };
  }, []);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children, staff = false }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();
  if (status === "checking") return <main className="page" role="status">{t("checkingSession")}</main>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (staff && !user?.is_staff) return <main className="page" role="alert">{t("staffOnly")}</main>;
  return children;
}
