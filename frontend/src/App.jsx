import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SaleProvider } from "./context/SaleContext";
import { CategoryProvider } from "./context/CategoryContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SyncStatus from "./components/SyncStatus";
import KeepAlive from "./components/KeepAlive";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";
import ConfirmSale from "./pages/ConfirmSale";
import SaleSuccess from "./pages/SaleSuccess";
import ProductManagement from "./pages/ProductManagement";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import Backup from "./pages/Backup";
import { flushPendingSales } from "./offline/sync";
import Profit from "./pages/Profit";
import OwnerSettings from "./pages/OwnerSettings";

export default function App() {
  useEffect(() => {
    flushPendingSales().catch(() => {});
    const handleOnline = () => flushPendingSales().catch(() => {});
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <AuthProvider>
      <SaleProvider>
        <CategoryProvider>
          <BrowserRouter>
            <KeepAlive />
            <SyncStatus />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profit" element={<ProtectedRoute><Profit /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/sale/new" element={<ProtectedRoute><NewSale /></ProtectedRoute>} />
              <Route path="/sale/confirm" element={<ProtectedRoute><ConfirmSale /></ProtectedRoute>} />
              <Route path="/sale/success" element={<ProtectedRoute><SaleSuccess /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><ProductManagement /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/backup" element={<ProtectedRoute><Backup /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><OwnerSettings /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </CategoryProvider>
      </SaleProvider>
    </AuthProvider>
  );
}
