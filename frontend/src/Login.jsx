import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

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
      setError("Email ya password galat hai.");
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
      setError("Code nahi bhej paye. Email check kar ya thodi der baad try kar.");
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
      setError("Code galat hai ya expire ho gaya. Dubara try kar.");
      return;
    }
    onLogin?.(data.session);
  }

  const titles = {
    password: "Log in to PDF Finder",
    email: "Sign up or reset password",
    code: "Check your email",
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-title">{titles[mode]}</h1>

        {mode === "password" && (
          <form onSubmit={loginWithPassword} className="login-form">
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

            <label className="login-label" htmlFor="password" style={{ marginTop: 14 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>

            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("email")}>
                New user? Sign up
              </button>
              <button type="button" className="login-link" onClick={() => go("email")}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {mode === "email" && (
          <form onSubmit={sendCode} className="login-form">
            <p className="login-sub">
              Email daal, hum ek code bhejenge. Code daalne ke baad password bana lena.
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

            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("password")}>
                Back to log in
              </button>
            </div>
          </form>
        )}

        {mode === "code" && (
          <form onSubmit={verifyCode} className="login-form">
            <p className="login-sub">
              Code bheja gaya: <strong>{email}</strong>
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

            <div className="login-links">
              <button type="button" className="login-link" onClick={sendCode}>
                Resend code
              </button>
              <button type="button" className="login-link" onClick={() => go("email")}>
                Change email
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
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
      setError("Password kam se kam 6 characters ka rakh.");
      return;
    }
    if (password !== confirm) {
      setError("Dono password match nahi kar rahe.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setLoading(false);
    if (error) {
      setError("Password save nahi hua. Dubara try kar.");
      return;
    }
    onDone?.();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-title">Create your password</h1>
        <form onSubmit={save} className="login-form">
          <p className="login-sub">
            Email verify ho gayi. Ab password bana, next time isi se login hoga.
          </p>

          <label className="login-label" htmlFor="newpass">Password</label>
          <input
            id="newpass"
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <label className="login-label" htmlFor="confirmpass" style={{ marginTop: 14 }}>
            Confirm password
          </label>
          <input
            id="confirmpass"
            type="password"
            className="login-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save password"}
          </button>
        </form>
      </section>
    </main>
  );
}
