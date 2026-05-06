import { createFileRoute } from "@tanstack/react-router";
import { SimpleList } from "./clientes";
export const Route = createFileRoute("/_admin/admin/onboarding")({
  component: () => <SimpleList table="onboarding_etapas" titulo="Etapas de Onboarding" cols={["titulo", "tipo", "ordem", "ativo"]} />,
});
