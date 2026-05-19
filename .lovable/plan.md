
# Integrar IRPF Central Hub, DistribuiLucros e Reforma Tributária ao portal

## Resumo

Como todos os projetos usam o **mesmo Supabase**, a forma mais limpa de fazer login único é: o portal pega a sessão atual do usuário (access_token + refresh_token) e passa pra URL do projeto-filho num fragmento `#`. O projeto-filho lê esses tokens, chama `supabase.auth.setSession(...)`, e o usuário já entra logado — sem precisar gerar JWT customizado, sem precisar reescrever auth.

Tokens em fragmento `#` **não são enviados pra servidor nenhum** (nem logs, nem analytics), e o `access_token` expira em 1h. É o mesmo mecanismo que o Supabase usa em magic links e OAuth.

## Como vai funcionar

```text
Cliente clica em "Acessar IRPF Central Hub" no portal
        │
        ▼
Portal pega session.access_token + refresh_token do supabase
        │
        ▼
Abre nova aba: https://irpf-central-hub.lovable.app/#sso=<base64(tokens)>
        │
        ▼
Projeto-filho detecta o # na URL, chama supabase.auth.setSession({access_token, refresh_token})
        │
        ▼
Limpa o # da URL (history.replaceState) e redireciona pra home/dashboard
        │
        ▼
Usuário já está logado — mesma sessão, mesmo user_id, mesmas RLS policies
```

## Mudanças no portal (esse projeto)

1. **`src/lib/sso.ts`** — helper `buildSsoUrl(baseUrl)` que pega a sessão atual do `supabase.auth.getSession()` e devolve `baseUrl#sso=<base64url>` com `{access_token, refresh_token, expires_at}`.

2. **`src/routes/_app/ferramentas.tsx`** — quando a ferramenta tem `requer_sso = true`, ao clicar:
   - chama `buildSsoUrl(f.url_acesso)`
   - abre a URL resultante em nova aba (`window.open`)
   - se a sessão estiver expirada, faz refresh antes
   - fallback: se não tiver sessão, abre URL sem token

3. **`src/routes/_admin/admin/ferramentas.tsx`** — já tem o toggle `requer_sso` (criado antes); só destravar e mostrar o switch no formulário.

4. **Cadastrar as 3 ferramentas** (eu posso fazer via SQL, ou você cadastra pelo `/admin/ferramentas`):
   - IRPF Central Hub
   - DistribuiLucros
   - Reforma Tributária

## Mudanças em cada projeto-filho (IRPF, DistribuiLucros, Reforma)

Em cada um dos 3 projetos, adicionar **um único arquivo** que roda no boot da app, antes do React renderizar. Algo do tipo:

```ts
// src/lib/sso-receiver.ts
import { supabase } from "@/integrations/supabase/client";

export async function consumeSsoToken() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash.startsWith("#sso=")) return;
  try {
    const payload = JSON.parse(atob(hash.slice(5)));
    await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    // limpa o hash sem reload
    history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch (e) {
    console.error("SSO token inválido", e);
  }
}
```

E chamar `await consumeSsoToken()` no entry point (antes do `<RouterProvider />` montar, ou no `beforeLoad` da root route). Posso fazer isso por você nos 3 projetos via cross-project tools, ou te passo o snippet pra colar.

**Pré-requisito:** os 3 projetos precisam estar usando exatamente o mesmo `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do portal. Como você confirmou "mesmo banco", isso já deve estar ok — mas vale verificar.

## Segurança

- Tokens vão no **fragmento `#`**, que browsers nunca enviam pra servidor (sem risco de aparecer em logs do Lovable ou Cloudflare).
- `access_token` expira em 1h; `refresh_token` permite renovar — mesmo modelo de qualquer sessão Supabase.
- Só funciona porque os 4 projetos compartilham o mesmo Supabase. Se um dia separar bancos, esse caminho deixa de funcionar e aí sim viraria JWT customizado.
- RLS dos projetos-filhos continua valendo igual: o `auth.uid()` lá será o mesmo do portal.

## O que NÃO vamos fazer

- Iframe embed (cada projeto roda em janela própria, mais robusto)
- JWT customizado assinado (desnecessário com Supabase compartilhado)
- Cookie cross-domain (não funciona entre subdomínios `.lovable.app` diferentes)

## Próximos passos depois de aprovar

1. Implemento o `sso.ts` + integração no card de ferramentas do portal
2. Cadastro as 3 ferramentas no banco (ou você cadastra)
3. Aplico o snippet `sso-receiver` nos 3 projetos-filhos via cross-project (preciso que você me confirme os nomes exatos dos projetos no workspace)
4. Testamos abrindo um dos cards e vendo se cai logado
