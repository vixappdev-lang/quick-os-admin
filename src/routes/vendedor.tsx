import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/vendedor")({
  head: () => ({ meta: [{ title: "Vendedor | Quick OS" }] }),
  component: VendedorLayout,
});

function VendedorLayout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/login" });
    else if (user.role !== "vendedor") navigate({ to: "/" });
  }, [ready, user, navigate]);

  if (!ready || !user || user.role !== "vendedor") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  return <Outlet />;
}