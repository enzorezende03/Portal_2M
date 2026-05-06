import { createFileRoute } from "@tanstack/react-router";
import { SimpleList } from "./clientes";
export const Route = createFileRoute("/_admin/admin/treinamentos")({
  component: () => <SimpleList table="treinamentos" titulo="Treinamentos" cols={["titulo", "descricao", "duracao_segundos", "ativo"]} />,
});
