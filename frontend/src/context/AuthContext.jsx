// src/context/AuthContext.jsx
// Reference: docs/Architecture_Decision_Records.docx (ADR-004)
// Token is cached in localStorage so a user who's already logged in can keep using
// the app (recording sales, browsing cached products) even with no connection.
import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("regimens_user");
    return cached ? JSON.parse(cached) : null;
  });

  async function login(username, password) {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("regimens_token", data.token);
    localStorage.setItem("regimens_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("regimens_token");
    localStorage.removeItem("regimens_user");
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
