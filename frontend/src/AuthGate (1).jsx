import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login, { SetPassword } from "./Login";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }

  if (checking) return null;

  // 1. login nahi hai -> Login page
  if (!session) return <Login onLogin={setSession} />;

  // 2. OTP se aaya par password abhi nahi bana -> password banao
  if (!session.user?.user_metadata?.has_password) {
    return <SetPassword onDone={refreshSession} />;
  }

  // 3. sab ok -> website
  return (
    <>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}
      >
        Log out
      </button>
      {children}
    </>
  );
}
