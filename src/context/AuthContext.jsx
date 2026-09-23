import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api, { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Restore token & verify on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token && user) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      authApi
        .me()
        .then((res) => {
          const fresh = res.data?.user;
          if (fresh) {
            setUser(fresh);
            localStorage.setItem("auth_user", JSON.stringify(fresh));
          }
        })
        .catch(() => {
          // Token expired
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    const { user: u, token } = res.data;
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(u));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  }, []);

  const can = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      const perms = {
        kasir: [
          "produk.view",
          "barang-keluar.manage",
          "laporan.view",
          "dashboard.view",
          "keuangan.view",
          "stok.view",
          "apriori.view",
        ],
        gudang: [
          "produk.view",
          "barang-masuk.manage",
          "laporan.view",
          "dashboard.view",
          "kategori.view",
          "supplier.view",
          "stok.view",
          "eoq.view",
          "pengadaan.view",
        ],
      };
      return (perms[user.role] || []).includes(permission);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
