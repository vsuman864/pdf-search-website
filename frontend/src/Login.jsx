import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

export default function Login({ onLogin }) {
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false }, // sirf pehle se bane admin users
    });

    setLoading(false);
    if (error) {
      setError("Code nahi bhej paye. Email check kar ya thodi der baad try kar.");
      return;
    }
    setStep("code");
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

  function changeEmail() {
    setStep("email");
    setCode("");
    setError("");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-title">
          {step === "email" ? "Log in to PDF Finder" : "Check your email"}
        </h1>

        {step === "email" ? (
          <form onSubmit={sendCode} className="login-form">
            <p className="login-sub">
              Email daal, hum ek login code bhejenge. Password ki zarurat nahi.
            </p>

            <label className="login-label" htmlFor="email">
              Email
            </label>
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

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="login-form">
            <p className="login-sub">
              Code bheja gaya: <strong>{email}</strong>
            </p>

            <label className="login-label" htmlFor="code">
              Login code
            </label>
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

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Checking..." : "Log in"}
            </button>

            <div className="login-links">
              <button type="button" className="login-link" onClick={sendCode}>
                Resend code
              </button>
              <button type="button" className="login-link" onClick={changeEmail}>
                Use a different email
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
