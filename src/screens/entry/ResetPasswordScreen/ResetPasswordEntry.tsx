import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/router/routes";
import { useAuthStore } from "@/stores/authStore";
import ResetPasswordScreen from "./ResetPasswordScreen";

export default function ResetPasswordEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const hasSession = typeof token === "string" && token.trim() !== "";

  useEffect(() => {
    if (!hasSession) return;
    clearAuth();
  }, [clearAuth, hasSession]);

  useEffect(() => {
    if (!tokenFromUrl) return;
    navigate(ROUTES.auth.resetPassword, {
      replace: true,
      state: { resetToken: tokenFromUrl },
    });
  }, [navigate, tokenFromUrl]);

  if (hasSession || tokenFromUrl) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return <ResetPasswordScreen />;
}
