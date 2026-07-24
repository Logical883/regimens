import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

function readCachedUser() {
  const raw = localStorage.getItem("regimens_user") || sessionStorage.getItem("regimens_user");
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());

  async function login(username, password, keepSignedIn = true) {
    const { data } = await api.post("/auth/login", { username, password });
    const store = keepSignedIn ? localStorage : sessionStorage;
    const other = keepSignedIn ? sessionStorage : localStorage;
    other.removeItem("regimens_token");
    other.removeItem("regimens_user");
    store.setItem("regimens_token", data.token);
    store.setItem("regimens_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("regimens_token");
    localStorage.removeItem("regimens_user");
    sessionStorage.removeItem("regimens_token");
    sessionStorage.removeItem("regimens_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}