import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Shell({ children }) {
  return (
    <main className="login-page">
      <aside className="login-aside">
        <div className="login-brand">
          <span className="login-logo"><LogoMark /></span>
          <span className="login-brand-name">PDF Finder</span>
        </div>

        <div className="login-pitch">
          <p className="login-eyebrow">Your study library</p>
          <h2>
            Find your next <span>great resource.</span>
          </h2>
          <p>Upload, discover and download your study PDFs in one simple place.</p>
          <ul>
            <li>Upload PDFs in seconds</li>
            <li>Search any file by name</li>
            <li>Download on any device</li>
          </ul>
        </div>
      </aside>

      <section className="login-main">
        <div className="login-card">{children}</div>
      </section>
    </main>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <label className="login-label" htmlFor={id}>{label}</label>
      <div className="login-pass">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="login-input"
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="login-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </>
  );
}

export default function Login({ onLogin }) {
  // "password" = email+password login | "email" = naya user / forgot | "code" = OTP verify
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function go(next) {
    setMode(next);
    setError("");
    setCode("");
  }

  async function loginWithPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError("Incorrect email or password.");
      return;
    }
    onLogin?.(data.session);
  }

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError("Couldn’t send the code. Check your email address or try again in a bit.");
      return;
    }
    setMode("code");
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Invalid or expired code. Please try again.");
      return;
    }
    onLogin?.(data.session);
  }

  const titles = {
    password: "Welcome back",
    email: "Create account or reset password",
    code: "Check your email",
  };

  return (
    <Shell>
      <h1 className="login-title">{titles[mode]}</h1>

      {mode === "password" && (
        <form onSubmit={loginWithPassword} className="login-form">
          <p className="login-sub">Log in to continue to PDF Finder.</p>

          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="login-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>

          <div className="login-links">
            <button type="button" className="login-link" onClick={() => go("email")}>
              Forgot password?
            </button>
          </div>

          <p className="login-switch">
            New here?{" "}
            <button type="button" className="login-link" onClick={() => go("email")}>
              Create an account
            </button>
          </p>
        </form>
      )}

      {mode === "email" && (
        <form onSubmit={sendCode} className="login-form">
          <p className="login-sub">
            Enter your email and we’ll send you a code. After verifying it, you’ll set a password.
          </p>

          <label className="login-label" htmlFor="email2">Email</label>
          <input
            id="email2"
            type="email"
            className="login-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send code"}
          </button>

          <p className="login-switch">
            <button type="button" className="login-link" onClick={() => go("password")}>
              Back to log in
            </button>
          </p>
        </form>
      )}

      {mode === "code" && (
        <form onSubmit={verifyCode} className="login-form">
          <p className="login-sub">
            Code sent to <strong>{email}</strong>
          </p>

          <label className="login-label" htmlFor="code">Code</label>
          <input
            id="code"
            className="login-input login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Verify code"}
          </button>

          <div className="login-links login-links-split">
            <button type="button" className="login-link" onClick={sendCode}>
              Resend code
            </button>
            <button type="button" className="login-link" onClick={() => go("email")}>
              Change email
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

// OTP verify ke baad password banane wala step
export function SetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setLoading(false);
    if (error) {
      setError("Couldn’t save the password. Please try again.");
      return;
    }
    onDone?.();
  }

  return (
    <Shell>
      <h1 className="login-title">Create your password</h1>
      <form onSubmit={save} className="login-form">
        <p className="login-sub">
          Email verified. Create a password to use for future logins.
        </p>

        <PasswordField
          id="newpass"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirmpass"
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save password"}
        </button>
      </form>
    </Shell>
  );
}
