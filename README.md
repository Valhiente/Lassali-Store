# Lassali Store

Plataforma de e-commerce fitness da Lassali Store com experiências separadas para
varejo, atacado com CNPJ, produtos oficiais Forbody e reposição das unidades
Forbody. A aplicação usa Next.js 16, React 19, TypeScript e Supabase.

## As 10 etapas implementadas

1. **Permissões e dados:** papéis distintos, autorização no servidor, Row Level
   Security e preços comerciais fora do acesso público.
2. **Cadastro de varejo:** conta, confirmação de e-mail, login, recuperação de
   senha, painel, pedidos e preferências.
3. **Cadastro de atacado:** validação real do CNPJ, dados empresariais, status
   pendente e liberação somente após análise.
4. **Unidades Forbody:** criação exclusiva pelo administrador, convite por e-mail
   e ativação de senha pelo responsável da unidade.
5. **Administração:** aprovação ou rejeição de empresas, bloqueio de contas,
   perfis administrativos e trilha de auditoria.
6. **Carrinho persistente:** armazenamento local versionado e sincronização com
   o banco; preços e variações são recalculados no servidor.
7. **Eventos comerciais:** criação de conta, candidatura de atacado, atualização
   e abandono de carrinho registrados sem expor dados sensíveis no navegador.
8. **Consentimento:** opt-in separado por canal e finalidade, preferências
   editáveis e descadastro assinado.
9. **Recuperação de carrinho:** mensagens em três estágios, idempotência,
   supressão e registro de entrega/erro.
10. **Recompra e reposição:** lembrete de recompra após 45 dias e painel de
    unidades com histórico por categoria e sugestão de estoque.

## Estrutura comercial

| Experiência | Entrada | Condição |
|---|---|---|
| Varejo Lassali | `/conta/cadastro` | Ativação após confirmação de e-mail |
| Atacado | `/conta/cadastro-atacado` | CNPJ válido e aprovação administrativa |
| Forbody varejo | `/forbody` | Catálogo público com preço de varejo |
| Unidade Forbody | `/unidades-forbody` | Convite e vínculo a uma unidade |
| Administração | `/admin` | Papel administrativo validado no servidor |

## Instalação

```bash
npm install
cp .env.example .env.local
npm run dev
```

1. Crie o projeto no Supabase.
2. Execute `supabase/migrations/202607290001_lassali_commerce.sql`.
3. Configure as URLs permitidas do Supabase Auth para o domínio da loja.
4. Preencha as variáveis de ambiente.
5. Faça o primeiro acesso administrativo com `POST /api/admin/bootstrap`,
   enviando `Authorization: Bearer $ADMIN_BOOTSTRAP_SECRET` e JSON com `email`
   e `fullName`. Depois, remova essa variável do ambiente.

## Variáveis

- `NEXT_PUBLIC_SITE_URL`: URL canônica da loja.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: acesso
  público limitado por RLS.
- `SUPABASE_SECRET_KEY`: uso exclusivo no servidor.
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL`: entrega dos e-mails transacionais e
  consentidos.
- `CRON_SECRET`: autenticação da rotina `/api/cron/lifecycle`.
- `UNSUBSCRIBE_SECRET`: assinatura dos links de descadastro.
- `ADMIN_BOOTSTRAP_SECRET`: somente durante a criação do primeiro admin.
- Mercado Pago e Melhor Envio estão reservados no ambiente para a etapa de
  contratação/configuração dos respectivos serviços.

## Automação de relacionamento

O `vercel.json` agenda uma execução diária da rotina de ciclo de vida. Carrinhos
recebem no máximo três contatos (1h, 24h e 72h) e somente quando há consentimento
específico para recuperação. A recompra é limitada a uma mensagem mensal por
cliente elegível. Descadastro e supressão são verificados antes de cada envio.

O consentimento de WhatsApp já é armazenado separadamente, mas nenhum disparo é
feito sem a contratação e configuração de um provedor oficial da Meta. Isso
evita automação irregular ou não autorizada.

## Validação

```bash
npm run lint
npm run typecheck
npm run build
```

Os produtos atuais são uma base demonstrativa criada com as imagens fornecidas.
Preços, estoque, frete e pagamento devem ser homologados com os dados comerciais
reais antes de liberar vendas em produção.
