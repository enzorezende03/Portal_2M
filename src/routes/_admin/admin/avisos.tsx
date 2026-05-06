import { createFileRoute } from "@tanstack/react-router";
import { SimpleList } from "./clientes";
export const Route = createFileRoute("/_admin/admin/avisos")({
  component: () => <SimpleList table="avisos" titulo="Avisos" cols={["titulo", "mensagem", "tipo", "ativo"]} />,
});
