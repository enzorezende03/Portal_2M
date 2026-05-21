## Integração G-Click → Portal do Cliente

### Descoberta
O G-Click (Omie) **tem API REST oficial** documentada no Postman (https://documenter.getpostman.com/view/12417251/UV5TFeha). Os endpoints relevantes:

- `GET Listar Tarefas` — retorna tarefas com dados do cliente (nome + inscrição/CNPJ) e filtros por obrigação/cliente
- `GET Listar Atividades por Tarefa` — retorna as atividades de uma tarefa; **quando a atividade tem anexo concluído, a resposta já inclui a URL do arquivo** (a guia em PDF)
- `GET Listar Carteiras` — responsáveis por cada cliente

Isso permite buscar exatamente as guias que as colaboradoras finalizam no G-Click e despejá-las no portal automaticamente, sem depender de email.

### Arquitetura proposta

```text
G-Click API ──polling──► Server Function (TanStack) ──► Storage (documentos-clientes/{user_id}/...)
                                  │                              │
                                  ▼                              ▼
                          Match por CNPJ              Tabela `documentos`
                          (clientes.cnpj /            (já existente, mesma
                           profiles.cnpj)              estrutura usada hoje)
                                  │
                                  ▼
                          Cliente vê em /documentacao
```

Reusa **toda** a infra já criada na aba Documentação (bucket privado `documentos-clientes`, tabela `documentos`, RLS por `user_id`, tela do cliente). Cada guia importada vira um registro em `documentos` vinculada ao `user_id` do cliente cujo CNPJ bate.

### Passo a passo

**1. Credenciais (você precisa providenciar antes)**
Pegar no G-Click (Configurações → Integrações → API) e me passar via tela de secrets:
- `GCLICK_APP_KEY`
- `GCLICK_APP_SECRET`
(O nome exato depende do que o painel do G-Click expõe — confirmo ao ler a doc completa.)

**2. Migração de banco**
Adicionar à tabela `documentos`:
- `origem text` (`'manual' | 'gclick'`) — default `'manual'`
- `gclick_atividade_id text unique` — evita duplicar a mesma guia em sincronizações repetidas
- `competencia text` (ex.: `"05/2026"`) e `vencimento date` — extraídos da tarefa

**3. Server functions (TanStack `createServerFn`)**
- `src/lib/gclick.server.ts` — client HTTP autenticado para a API do G-Click
- `src/lib/gclick-sync.functions.ts`:
  - `sincronizarGclick` (admin-only via `requireSupabaseAuth` + checagem `has_role admin`): lista tarefas dos últimos N dias, para cada uma busca atividades, filtra as concluídas com anexo, baixa o PDF, faz upload em `documentos-clientes/{user_id}/gclick/...`, insere em `documentos` (idempotente via `gclick_atividade_id`)
  - `listarPendenciasGclick`: pré-visualização (mostra o que será importado e quais clientes não têm CNPJ cadastrado / não dão match)

**4. Match cliente → user_id**
Regra: `gclick.cliente.cnpj` (só dígitos) = `profiles.cnpj` (só dígitos). Se não achar, registra em log de pendência (não falha o batch). Tela admin lista esses casos para correção manual.

**5. UI admin (`/admin/integracoes/gclick`)**
- Botão **"Sincronizar agora"** (chama `sincronizarGclick`)
- Filtros: período (últimos 7/30 dias), tipo de obrigação
- Tabela com: tarefa, cliente, CNPJ, status do match, ação importada
- Lista de **pendências** (CNPJ sem cadastro no portal)
- Histórico das últimas sincronizações

**6. Sincronização automática (opcional, recomendada)**
Rota pública `src/routes/api/public/gclick-sync.ts` protegida por header secreto (`X-Sync-Token`). Você agenda no **n8n** (ou cron-job.org) um POST diário às 6h → o n8n só dispara, toda a lógica fica no Lovable. Vantagem: não precisa manter workflow complexo no n8n, fica tudo versionado no projeto.

**7. UI cliente — sem mudança estrutural**
As guias aparecem na aba **Documentação** já existente. Adiciono apenas:
- Badge "G-Click" quando `origem = 'gclick'`
- Ordenação por competência/vencimento
- Agrupamento opcional por mês

### N8N vs direto no Lovable — recomendação

Como você tem API direta, **fazer tudo no Lovable é melhor**:
- Lógica versionada no código
- Sem custo extra de hospedagem n8n
- Sem ponto de falha intermediário
- Logs no painel do Lovable Cloud

O **n8n entra só (e se quiser) como agendador externo** chamando o endpoint público — função que o cron-job.org grátis também faz.

### O que fica fora deste plano (próximas iterações)
- Webhook reverso (G-Click → Lovable em tempo real): a doc atual não menciona webhooks de atividade concluída; se existir, trocamos polling por push depois
- Notificar cliente por email/WhatsApp quando uma nova guia chega
- Marcar a tarefa como "entregue ao cliente" de volta no G-Click

### Próximo passo
Se aprovar, eu já abro a tela de secrets pedindo as credenciais do G-Click e começo pela migração + server function de sincronização.
