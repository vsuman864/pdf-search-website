import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";

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

  if (checking) return null; // session check hone tak blank

  if (!session) return <Login onLogin={setSession} />;

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
