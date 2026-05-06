import { createFileRoute } from "@tanstack/react-router";
import { SimpleList } from "./clientes";
export const Route = createFileRoute("/_admin/admin/ferramentas")({
  component: () => <SimpleList table="ferramentas" titulo="Ferramentas" cols={["nome", "descricao", "url_acesso", "ativo"]} />,
});
