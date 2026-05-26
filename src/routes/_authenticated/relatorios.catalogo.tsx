import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/relatorios/catalogo")({
  beforeLoad: () => {
    throw redirect({ to: "/relatorios" });
  },
  component: () => null,
});