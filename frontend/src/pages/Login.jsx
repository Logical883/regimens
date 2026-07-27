import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Shield, TriangleAlert, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandMark from "../components/BrandMark";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password, keepSignedIn);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === "ERR_NETWORK" || !err.response
            ? "Couldn't reach the API. Check VITE_API_URL on Vercel and CORS_ORIGIN on Render."
            : "Couldn't log in. Check your connection and try again.")
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
            Secure admin login
          </div>
          <h1 className="auth-title">Sign in to your admin account</h1>
          <hr className="auth-divider" />

          <div className="field">
            <label className="label" htmlFor="username">Username</label>
            <div className="input">
              <User size={18} strokeWidth={1.75} />
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="password">Password</label>
              <span className="link-quiet">Forgot?</span>
            </div>
            <div className="input">
              <Lock size={18} strokeWidth={1.75} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
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

          <label className="check-row">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            Keep me signed in for 30 days
          </label>

          {error && (
            <div className="alert alert--error" role="alert">
              <TriangleAlert size={18} strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          <button className="btn btn--primary" type="submit" disabled={loading}>
            <Lock size={16} strokeWidth={1.75} />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}