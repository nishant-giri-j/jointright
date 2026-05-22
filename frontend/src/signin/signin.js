import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signupAPI, apiUtils } from "../services/api";
import { AUTH_STYLES } from "./login";

const STEP = { EMAIL: "email", VERIFY: "verify", DONE: "done" };

/* ── Password checker ──────────────────────────────────────────── */
const PWD_RULES = [
  { re: /.{8,}/,      label: "At least 8 characters" },
  { re: /[A-Z]/,      label: "One uppercase letter"  },
  { re: /[a-z]/,      label: "One lowercase letter"  },
  { re: /\d/,         label: "One number"             },
  { re: /[^A-Za-z0-9]/, label: "One special character" },
];

const checkStrength = (pwd) => {
  const passed = PWD_RULES.filter(r => r.re.test(pwd));
  return {
    score:    passed.length,
    isStrong: passed.length === PWD_RULES.length,
    missing:  PWD_RULES.filter(r => !r.re.test(pwd)).map(r => r.label),
  };
};

const strengthColor = s => s <= 1 ? "#ef4444" : s <= 3 ? "#f59e0b" : "#10b981";
const strengthLabel = s => s <= 1 ? "Weak" : s <= 3 ? "Fair" : s <= 4 ? "Good" : "Strong 💪";

/* ── Component ─────────────────────────────────────────────────── */
const SignupPage = () => {
  const navigate     = useNavigate();

  const [step,         setStep]        = useState(STEP.EMAIL);
  const [email,        setEmail]       = useState("");
  const [otp,          setOtp]         = useState("");
  const [firstName,    setFirstName]   = useState("");
  const [lastName,     setLastName]    = useState("");
  const [password,     setPassword]    = useState("");
  const [confirmPwd,   setConfirmPwd]  = useState("");
  const [showPwd,      setShowPwd]     = useState(false);
  const [isLoading,    setIsLoading]   = useState(false);
  const [error,        setError]       = useState("");
  const [success,      setSuccess]     = useState("");
  const [otpTimer,     setOtpTimer]    = useState(0);
  const [strength,     setStrength]    = useState({ score: 0, isStrong: false, missing: [] });

  const clearMessages = useCallback(() => { setError(""); setSuccess(""); }, []);

  // OTP countdown
  React.useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  /* ── Step 1: Send OTP ──────────────────────────────── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const data = await signupAPI.requestOtp(email);
      setStep(STEP.VERIFY);
      setOtpTimer(300);

      if (data.developmentOtp) {
        setSuccess(`[DEV] Your code is: ${data.developmentOtp}`);
      } else {
        setSuccess(`Verification code sent to ${email}. Check your inbox.`);
      }
    } catch (err) {
      const apiErr = apiUtils.handleApiError(err);
      if (apiErr.code === "USER_ALREADY_EXISTS") {
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(apiErr.message || "Failed to send verification code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2: Resend OTP ────────────────────────────── */
  const handleResend = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const data = await signupAPI.resendOtp(email);
      setOtpTimer(300);
      setSuccess(data.developmentOtp
        ? `[DEV] New code: ${data.developmentOtp}`
        : "New verification code sent!");
    } catch (err) {
      setError(apiUtils.handleApiError(err).message || "Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2: Verify + create account ──────────────── */
  const handleVerify = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!otp || otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    if (password !== confirmPwd)  { setError("Passwords do not match."); return; }
    if (!strength.isStrong)       { setError("Password doesn't meet all requirements."); return; }

    setIsLoading(true);
    try {
      const data = await signupAPI.verifySignup({
        email, otp, password, confirmPassword: confirmPwd, firstName, lastName,
      });

      // Token returned — auto-login immediately
      if (data.token && data.user) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));
        localStorage.setItem("isLoggedIn", "true");
      }

      setStep(STEP.DONE);
      setTimeout(() => navigate("/dashboard"), 2200);
    } catch (err) {
      const apiErr = apiUtils.handleApiError(err);
      if (Array.isArray(apiErr.details) && apiErr.details.length) {
        setError(`${apiErr.message}: ${apiErr.details.join(", ")}`);
      } else if (apiErr.code === "INVALID_OTP") {
        setError("Invalid code. Check your email and try again.");
      } else if (apiErr.code === "EXPIRED_OTP") {
        setError("Code has expired. Click 'Resend Code' to get a new one.");
      } else {
        setError(apiErr.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Render ─────────────────────────────────────────── */
  const progressPct = step === STEP.EMAIL ? 33 : step === STEP.VERIFY ? 66 : 100;

  return (
    <>
      <style>{AUTH_STYLES}</style>

      <div className="auth-bg">
        {/* Decorative balls */}
        <div className="auth-ball" style={{ width: 90,  height: 90,  background: "linear-gradient(135deg,#8b5cf6,#ec4899)", top: "12%",  left: "8%",   animationDelay: "0s" }} />
        <div className="auth-ball" style={{ width: 60,  height: 60,  background: "linear-gradient(135deg,#06b6d4,#6366f1)", top: "68%",  right: "8%",  animationDelay: "2.5s" }} />
        <div className="auth-ball" style={{ width: 110, height: 110, background: "linear-gradient(135deg,#f97316,#facc15)", bottom: "10%", left: "12%",  animationDelay: "4s" }} />

        <div className="auth-card" style={{ maxWidth: 500 }}>

          {/* ── Logo + Progress ── */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: "2.6rem", marginBottom: 6 }}>🚀</div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Join JointRight
            </h1>
            <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "0.9rem" }}>
              {step === STEP.EMAIL  && "Create your free account in minutes"}
              {step === STEP.VERIFY && `Enter the 6-digit code sent to ${email}`}
              {step === STEP.DONE   && "You're all set!"}
            </p>

            {/* Progress bar */}
            <div style={{ marginTop: 20, background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.78rem", fontWeight: 600 }}>
              {["Email", "Verify", "Done"].map((l, i) => (
                <span key={l} style={{ color: progressPct >= (i + 1) * 33 ? "#6366f1" : "#cbd5e1" }}>{l}</span>
              ))}
            </div>
          </div>

          {/* ── Alerts ── */}
          {error && (
            <div className="error-alert" style={{ marginBottom: 20 }}>
              <span>⚠️</span>
              <span style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: 500 }}>{error}</span>
            </div>
          )}
          {success && (
            <div className="success-alert" style={{ marginBottom: 20 }}>
              <span>✅</span>
              <span style={{ color: "#059669", fontSize: "0.9rem", fontWeight: 500 }}>{success}</span>
            </div>
          )}

          {/* ════════ STEP 1: EMAIL ════════ */}
          {step === STEP.EMAIL && (
            <form onSubmit={handleSendOtp} noValidate>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  id="signup-email"
                  className="auth-input"
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

              <button className="auth-btn auth-btn-primary" type="submit" disabled={isLoading || !email}>
                {isLoading ? <><Spinner />Sending…</> : <>📧 Send Verification Code</>}
              </button>

              <div className="divider">or</div>
              <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={() => navigate("/")}>Sign in</button>
              </div>
            </form>
          )}

          {/* ════════ STEP 2: VERIFY + DETAILS ════════ */}
          {step === STEP.VERIFY && (
            <form onSubmit={handleVerify} noValidate>
              {/* OTP */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Verification Code</label>
                <input
                  id="signup-otp"
                  className="auth-input"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g,"").slice(0,6)); clearMessages(); }}
                  disabled={isLoading}
                  style={{ textAlign: "center", fontSize: "1.8rem", letterSpacing: "8px", fontWeight: 700 }}
                  required
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  {otpTimer > 0 ? (
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>⏰ Expires in {fmt(otpTimer)}</span>
                  ) : (
                    <button type="button" className="auth-link" style={{ fontSize: "0.85rem" }} onClick={handleResend} disabled={isLoading}>
                      Resend Code
                    </button>
                  )}
                  <button type="button" className="auth-link" style={{ fontSize: "0.82rem", color: "#94a3b8" }}
                    onClick={() => { setStep(STEP.EMAIL); setOtp(""); clearMessages(); }}>
                    Change email
                  </button>
                </div>
              </div>

              {/* Name row */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First Name</label>
                  <input id="signup-first" className="auth-input" type="text" placeholder="First" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={isLoading} style={{ paddingRight: 18 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <input id="signup-last" className="auth-input" type="text" placeholder="Last" value={lastName} onChange={e => setLastName(e.target.value)} disabled={isLoading} style={{ paddingRight: 18 }} />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Password</label>
                <div className="input-wrapper">
                  <input
                    id="signup-password"
                    className={`auth-input${password && strength.isStrong ? " success-border" : ""}`}
                    type={showPwd ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setStrength(checkStrength(e.target.value)); clearMessages(); }}
                    disabled={isLoading}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>

                {/* Strength indicator */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.8rem" }}>
                      <span style={{ fontWeight: 600, color: strengthColor(strength.score) }}>{strengthLabel(strength.score)}</span>
                      <span style={{ color: "#94a3b8" }}>{strength.score}/5</span>
                    </div>
                    <div style={{ background: "#e5e7eb", borderRadius: 4, height: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(strength.score/5)*100}%`, background: strengthColor(strength.score), borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                    {strength.missing.length > 0 && (
                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {strength.missing.map(m => (
                          <span key={m} style={{ fontSize: "0.75rem", background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 20, border: "1px solid #fca5a5" }}>✗ {m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="signup-confirm"
                    className={`auth-input${confirmPwd && password !== confirmPwd ? " error-border" : confirmPwd && password === confirmPwd ? " success-border" : ""}`}
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPwd}
                    onChange={e => { setConfirmPwd(e.target.value); clearMessages(); }}
                    disabled={isLoading}
                    required
                  />
                </div>
                {confirmPwd && password !== confirmPwd && (
                  <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "4px 0 0" }}>❌ Passwords don't match</p>
                )}
                {confirmPwd && password === confirmPwd && (
                  <p style={{ color: "#10b981", fontSize: "0.8rem", margin: "4px 0 0" }}>✅ Passwords match</p>
                )}
              </div>

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={isLoading || otp.length < 6 || !strength.isStrong || password !== confirmPwd}
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}
              >
                {isLoading ? <><Spinner />Creating Account…</> : <>🎉 Create Account</>}
              </button>

              <div className="divider">or</div>
              <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#64748b" }}>
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={() => navigate("/")}>Sign in</button>
              </div>
            </form>
          )}

          {/* ════════ STEP 3: DONE ════════ */}
          {step === STEP.DONE && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "5rem", marginBottom: 16, animation: "fadeUp 0.4s ease" }}>🎉</div>
              <h2 style={{ color: "#1e293b", margin: "0 0 12px" }}>Welcome to JointRight!</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>Your account is ready. Taking you to your dashboard…</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <Spinner />
                <span style={{ color: "#6366f1", fontWeight: 600 }}>Logging you in…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Helpers ─────────────────────────────────────────────────── */
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

export default SignupPage;
