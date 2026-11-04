import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login, { SetPassword } from "./Login";

// App.jsx me: const { session, openAuth, logout } = useAuth();
export const AuthContext = createContext({
  session: null,
  openAuth: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authView, setAuthView] = useState(null); // null | "login" | "signup"

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setAuthView(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }

  async function logout() {
    setAuthView(null);
    await supabase.auth.signOut();
  }

  if (checking) return null;

  // OTP se aaya par password abhi nahi bana -> password banao
  if (session && !session.user?.user_metadata?.has_password) {
    return <SetPassword onDone={refreshSession} />;
  }

  // Log in / Sign up dabaya -> auth page
  if (!session && authView) {
    return (
      <Login
        initialMode={authView === "signup" ? "email" : "password"}
        onLogin={(s) => {
          setSession(s);
          setAuthView(null);
        }}
        onBack={() => setAuthView(null)}
      />
    );
  }

  // Baaki sab ko website (home page) dikhao, login ke bina bhi
  return (
    <AuthContext.Provider value={{ session, openAuth: setAuthView, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
