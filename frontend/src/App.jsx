// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SaleProvider } from "./context/SaleContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SyncStatus from "./components/SyncStatus";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";
import ConfirmSale from "./pages/ConfirmSale";
import SaleSuccess from "./pages/SaleSuccess";
import { flushPendingSales } from "./offline/sync";

export default function App() {
  // Reference: docs/Architecture_Decision_Records.docx (ADR-005)
  // Try to flush the offline queue on load and whenever connectivity returns.
  useEffect(() => {
    flushPendingSales().catch(() => {});
    const handleOnline = () => flushPendingSales().catch(() => {});
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <AuthProvider>
      <SaleProvider>
        <BrowserRouter>
          <SyncStatus />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sale/new"
              element={
                <ProtectedRoute>
                  <NewSale />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sale/confirm"
              element={
                <ProtectedRoute>
                  <ConfirmSale />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sale/success"
              element={
                <ProtectedRoute>
                  <SaleSuccess />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </SaleProvider>
    </AuthProvider>
  );
}
