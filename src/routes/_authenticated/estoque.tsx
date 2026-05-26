import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout puro — index e movimentações renderizam aqui via <Outlet/>.
export const Route = createFileRoute("/_authenticated/estoque")({
  component: () => <Outlet />,
});