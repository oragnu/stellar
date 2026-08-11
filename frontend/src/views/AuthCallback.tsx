import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * The actual OAuth code<->token exchange happens server-side
 * (GET /api/v1/auth/github/callback), which redirects the browser straight
 * to /dashboard on success — so in practice this route is rarely hit
 * directly. It exists as a safe landing spot / loading state for any client
 * that lands here mid-flow, and as the place a future client-driven OAuth
 * variant would plug into.
 */
export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/dashboard", { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
      Signing you in…
    </div>
  );
}
