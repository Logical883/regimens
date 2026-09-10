import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Lock, Shield, TriangleAlert, User } from "lucide-react";
import api from "../api/client";
import BrandMark from "../components/BrandMark";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        username,
        recoveryCode,
        newPassword,
      });
      setSuccess(data?.message || "Password updated. You can sign in now.");
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data.trim().split("\n")[0] : "");
      setError(
        apiMessage ||
          (err.code === "ERR_NETWORK" || !err.response
            ? "Couldn't reach the API. Try again when the server is up."
            : "Couldn't reset the password. Try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen--centered">
      <div className="auth-layout">
        <BrandMark centered />
        <form className="auth-shell" onSubmit={handleSubmit}>
          <div className="auth-kicker">
            <Shield size={14} strokeWidth={1.75} />
            Account recovery
          </div>
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-lead">
            Accounts in this shop don&apos;t use email. Ask the owner for the shop recovery
            code, then choose a new password.
          </p>
          <hr className="auth-divider" />

          <div className="field">
            <label className="label" htmlFor="forgot-username">Username</label>
            <div className="input">
              <User size={18} strokeWidth={1.75} />
              <input
                id="forgot-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. owner"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="recovery-code">Shop recovery code</label>
            <div className="input">
              <KeyRound size={18} strokeWidth={1.75} />
              <input
                id="recovery-code"
                type="password"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Code from the shop owner"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="new-password">New password</label>
            <div className="input">
              <Lock size={18} strokeWidth={1.75} />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="confirm-password">Confirm password</label>
            <div className="input">
              <Lock size={18} strokeWidth={1.75} />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              <TriangleAlert size={18} strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert--success" role="status">
              <span>{success}</span>
            </div>
          )}

          <button className="btn btn--primary" type="submit" disabled={loading || Boolean(success)}>
            <KeyRound size={16} strokeWidth={1.75} />
            {loading ? "Updating..." : "Update password"}
          </button>

          <p className="auth-footer">
            <Link className="link-quiet" to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
