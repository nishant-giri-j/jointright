import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

/* ─── Shared CSS injected once ─────────────────────────────────── */
const AUTH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes floatBall {
    0%,100% { transform: translateY(0) rotate(0deg); }
    50%      { transform: translateY(-20px) rotate(180deg); }
  }
  @keyframes gradientBG {
    0%   { background-position: 0%   50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0%   50%; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-6px); }
    40%,80% { transform: translateX(6px); }
  }

  .auth-bg {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea, #764ba2, #f97316, #667eea);
    background-size: 400% 400%;
    animation: gradientBG 12s ease infinite;
  }

  .auth-ball {
    position: absolute;
    border-radius: 50%;
    opacity: 0.12;
    animation: floatBall 7s ease-in-out infinite;
    pointer-events: none;
  }

  .auth-card {
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 48px 44px;
    width: 100%;
    max-width: 460px;
    box-shadow: 0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.15);
    animation: fadeUp 0.5s ease-out;
    position: relative;
    z-index: 10;
  }

  .auth-input {
    width: 100%;
    padding: 14px 48px 14px 18px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    font-family: inherit;
    background: #fafbfc;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    outline: none;
    color: #1e293b;
  }
  .auth-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    transform: translateY(-1px);
    background: #fff;
  }
  .auth-input.error-border { border-color: #ef4444; }
  .auth-input.success-border { border-color: #10b981; }

  .auth-btn {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: 0.02em;
  }
  .auth-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .auth-btn:not(:disabled):active { transform: translateY(0); }
  .auth-btn:disabled { opacity: 0.65; cursor: not-allowed; }

  .auth-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
  .auth-btn-primary:not(:disabled):hover { background: linear-gradient(135deg, #4f46e5, #3730a3); }

  .auth-btn-ghost { background: transparent; color: #6366f1; font-weight: 500; padding: 6px; width: auto; }

  .error-alert { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 10px; animation: shake 0.35s ease; }
  .success-alert { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 10px; }

  .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; color: #94a3b8; padding: 4px; line-height: 1; }
  .eye-btn:hover { color: #6366f1; }

  .input-wrapper { position: relative; }

  .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; color: #94a3b8; font-size: 0.875rem; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

  .auth-link { color: #6366f1; font-weight: 600; cursor: pointer; background: none; border: none; font-family: inherit; font-size: inherit; padding: 0; }
  .auth-link:hover { color: #4f46e5; text-decoration: underline; }

  .feature-row { display: flex; gap: 12px; margin-top: 28px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
  .feature-item { flex: 1; text-align: center; padding: 12px 8px; border-radius: 10px; background: #f8fafc; font-size: 0.78rem; color: #64748b; font-weight: 500; }
  .feature-item .fi { font-size: 1.3rem; display: block; margin-bottom: 4px; }

  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge-amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

  .otp-digits { display: flex; gap: 8px; justify-content: center; }
  .otp-digits input { width: 48px; height: 56px; text-align: center; font-size: 1.5rem; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 10px; outline: none; font-family: inherit; background: #fafbfc; transition: border-color 0.2s; }
  .otp-digits input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: #fff; }
`;

/* ─── View enum ─────────────────────────────────────────────────── */
const VIEW = { LOGIN: "login", FORGOT: "forgot", RESET: "reset" };

/* ─── Main Component ─────────────────────────────────────────────── */
const LoginPage = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { login }   = useAuth();

  const [view,         setView]        = useState(VIEW.LOGIN);
  const [email,        setEmail]       = useState("");
  const [password,     setPassword]    = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]  = useState(false);
  const [isLoading,    setIsLoading]   = useState(false);
  const [error,        setError]       = useState("");
  const [success,      setSuccess]     = useState("");
  const [loginContext, setLoginContext] = useState(null);

  // Forgot / Reset state
  const [forgotEmail,    setForgotEmail]    = useState("");
  const [resetOtp,       setResetOtp]       = useState("");
  const [newPassword,    setNewPassword]    = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [showNewPass,    setShowNewPass]    = useState(false);

  // Detect meeting/contact login context
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const returnUrl = params.get("returnUrl");
    const type      = params.get("type");
    if (type === "meeting") {
      const pendingMeeting = sessionStorage.getItem("pendingMeeting");
      setLoginContext({
        type: "meeting",
        returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null,
        meetingData: pendingMeeting ? JSON.parse(pendingMeeting) : null,
      });
    } else if (type === "contact") {
      setLoginContext({ type: "contact", returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null });
    }
  }, [location.search]);

  const clearMessages = useCallback(() => { setError(""); setSuccess(""); }, []);

  /* ── LOGIN ──────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const result = await login({ email, password, rememberMe });

      if (loginContext?.type === "meeting") {
        navigate(loginContext.returnUrl || "/join", { replace: true });
        return;
      }
      if (loginContext?.type === "contact") {
        navigate(loginContext.returnUrl || "/contact", { replace: true });
        return;
      }

      // Role-based redirect
      if (result?.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const code    = err.code || "";
      const msg     = err.message || "";
      const remaining = err.remainingAttempts;

      if (code === "USER_NOT_FOUND") {
        setError("No account found with this email. Please sign up first.");
      } else if (code === "ACCOUNT_LOCKED" || code === "ACCOUNT_LOCKED_ATTEMPTS") {
        setError(msg || "Account is temporarily locked. Try again later.");
      } else if (code === "ACCOUNT_DEACTIVATED") {
        setError("Your account has been deactivated. Contact support.");
      } else if (code === "INVALID_PASSWORD") {
        setError(remaining != null
          ? `Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`
          : "Incorrect password. Please try again.");
      } else if (code === "NETWORK_ERROR" || msg.toLowerCase().includes("network")) {
        setError("Cannot reach the server. Please check your connection.");
      } else {
        setError(msg || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── FORGOT PASSWORD ────────────────────────────────── */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const resp = await api.post("/login/forgot-password", { email: forgotEmail });
      if (resp.data?.developmentOtp) {
        setSuccess(`[DEV] Reset code: ${resp.data.developmentOtp}`);
      } else {
        setSuccess("If this email is registered, you'll receive a reset code shortly.");
      }
      // Move to reset view regardless (security — don't reveal if email exists)
      setTimeout(() => {
        setResetOtp("");
        setView(VIEW.RESET);
        setError("");
        setSuccess("");
      }, 1500);
    } catch {
      setError("Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── RESET PASSWORD ─────────────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsLoading(true);

    try {
      await api.post("/login/reset-password", {
        email:           forgotEmail,
        otp:             resetOtp,
        newPassword,
        confirmPassword,
      });
      setSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => {
        setView(VIEW.LOGIN);
        setEmail(forgotEmail);
        setForgotEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setResetOtp("");
        setSuccess("");
      }, 2000);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "INVALID_OTP")    setError("Invalid reset code. Please check and try again.");
      else if (code === "EXPIRED_OTP") setError("Reset code has expired. Please request a new one.");
      else setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <>
      <style>{AUTH_STYLES}</style>

      <div className="auth-bg">
        {/* Floating decorative balls */}
        <div className="auth-ball" style={{ width: 80,  height: 80,  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", top: "15%", left: "8%",  animationDelay: "0s" }} />
        <div className="auth-ball" style={{ width: 50,  height: 50,  background: "linear-gradient(135deg,#f97316,#ef4444)", top: "65%", right: "10%", animationDelay: "2s" }} />
        <div className="auth-ball" style={{ width: 100, height: 100, background: "linear-gradient(135deg,#06b6d4,#6366f1)", bottom: "15%", left: "15%", animationDelay: "4s" }} />

        <div className="auth-card">
          {/* ── Logo ── */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: "2.8rem", marginBottom: 8 }}>🤝</div>
            <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              JointRight
            </h1>
            <p style={{ color: "#64748b", margin: "8px 0 0", fontSize: "0.95rem" }}>
              {view === VIEW.LOGIN  && (loginContext?.type === "meeting" ? "Sign in to join the meeting" : "Welcome back! Sign in to continue.")}
              {view === VIEW.FORGOT && "Enter your email to receive a reset code"}
              {view === VIEW.RESET  && "Enter the code sent to your email"}
            </p>

            {/* Context badge */}
            {view === VIEW.LOGIN && loginContext?.type === "meeting" && (
              <div style={{ marginTop: 12 }}>
                <span className="badge badge-amber">🎥 Meeting Access Required</span>
              </div>
            )}
            {view === VIEW.LOGIN && !loginContext && (
              <div style={{ marginTop: 12 }}>
                <span className="badge badge-blue">✨ Secure Login</span>
              </div>
            )}
          </div>

          {/* ── Alerts ── */}
          {error && (
            <div className="error-alert" style={{ marginBottom: 20 }}>
              <span>⚠️</span>
              <span style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.4 }}>{error}</span>
            </div>
          )}
          {success && (
            <div className="success-alert" style={{ marginBottom: 20 }}>
              <span>✅</span>
              <span style={{ color: "#059669", fontSize: "0.9rem", fontWeight: 500 }}>{success}</span>
            </div>
          )}

          {/* ════════════════════ LOGIN FORM ════════════════════ */}
          {view === VIEW.LOGIN && (
            <form onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="login-email"
                    className={`auth-input${error ? " error-border" : ""}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearMessages(); }}
                    disabled={isLoading}
                    autoComplete="email"
                    required
                    style={{ paddingRight: 18 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Password</label>
                <div className="input-wrapper">
                  <input
                    id="login-password"
                    className={`auth-input${error ? " error-border" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearMessages(); }}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Options row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem", color: "#374151", fontWeight: 500 }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-link"
                  style={{ fontSize: "0.9rem" }}
                  onClick={() => { setView(VIEW.FORGOT); setForgotEmail(email); clearMessages(); }}
                >
                  Forgot password?
                </button>
              </div>

              <button className="auth-btn auth-btn-primary" type="submit" disabled={isLoading || !email || !password}>
                {isLoading ? <><Spinner />Signing in…</> : <>🔐 Sign In</>}
              </button>

              <div className="divider">or</div>

              <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.95rem" }}>
                Don't have an account?{" "}
                <button type="button" className="auth-link" onClick={() => navigate("/signup")}>
                  Sign up free
                </button>
              </div>

              <div className="feature-row">
                {[["🎯","Meetings"],["🔒","Secure"],["⚡","Fast"]].map(([icon,label]) => (
                  <div key={label} className="feature-item"><span className="fi">{icon}</span>{label}</div>
                ))}
              </div>
            </form>
          )}

          {/* ════════════════════ FORGOT PASSWORD FORM ════════════════════ */}
          {view === VIEW.FORGOT && (
            <form onSubmit={handleForgotPassword} noValidate>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  id="forgot-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => { setForgotEmail(e.target.value); clearMessages(); }}
                  disabled={isLoading}
                  required
                  style={{ paddingRight: 18 }}
                />
              </div>

              <button className="auth-btn auth-btn-primary" type="submit" disabled={isLoading || !forgotEmail} style={{ marginBottom: 16 }}>
                {isLoading ? <><Spinner />Sending…</> : <>📧 Send Reset Code</>}
              </button>

              <button
                type="button"
                className="auth-btn"
                style={{ background: "#f1f5f9", color: "#475569" }}
                onClick={() => { setView(VIEW.RESET); clearMessages(); }}
                disabled={isLoading}
              >
                I already have a code
              </button>

              <div className="divider">or</div>
              <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#64748b" }}>
                Remember it?{" "}
                <button type="button" className="auth-link" onClick={() => { setView(VIEW.LOGIN); clearMessages(); }}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ════════════════════ RESET PASSWORD FORM ════════════════════ */}
          {view === VIEW.RESET && (
            <form onSubmit={handleResetPassword} noValidate>
              {/* OTP */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Reset Code (6 digits)</label>
                <input
                  id="reset-otp"
                  className="auth-input"
                  type="text"
                  placeholder="000000"
                  value={resetOtp}
                  maxLength={6}
                  onChange={e => { setResetOtp(e.target.value.replace(/\D/g,"").slice(0,6)); clearMessages(); }}
                  disabled={isLoading}
                  style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: "6px", fontWeight: 700 }}
                  required
                />
              </div>

              {/* New password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>New Password</label>
                <div className="input-wrapper">
                  <input
                    id="reset-new-password"
                    className="auth-input"
                    type={showNewPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); clearMessages(); }}
                    disabled={isLoading}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowNewPass(p => !p)} tabIndex={-1}>
                    {showNewPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="reset-confirm-password"
                    className={`auth-input${confirmPassword && newPassword !== confirmPassword ? " error-border" : confirmPassword && newPassword === confirmPassword ? " success-border" : ""}`}
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearMessages(); }}
                    disabled={isLoading}
                    required
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 4 }}>❌ Passwords don't match</p>
                )}
              </div>

              <div style={{ marginBottom: 24 }} />

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={isLoading || resetOtp.length < 6 || !newPassword || newPassword !== confirmPassword}
              >
                {isLoading ? <><Spinner />Resetting…</> : <>🔑 Reset Password</>}
              </button>

              <div className="divider">or</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", fontSize: "0.9rem", color: "#64748b" }}>
                <button type="button" className="auth-link"
                  onClick={() => { setView(VIEW.FORGOT); clearMessages(); }}>
                  Resend code
                </button>
                <span>·</span>
                <button type="button" className="auth-link"
                  onClick={() => { setView(VIEW.LOGIN); clearMessages(); }}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Shared helpers ───────────────────────────────────────────── */
const Spinner = () => (
  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
);

const labelStyle = {
  display: "block",
  color: "#374151",
  fontSize: "0.9rem",
  fontWeight: 600,
  marginBottom: 8,
};

export default LoginPage;
export { AUTH_STYLES };
