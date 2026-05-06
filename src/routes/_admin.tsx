import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/ProtectedLayout";

export const Route = createFileRoute("/_admin")({
  component: () => <ProtectedLayout adminOnly />,
});
