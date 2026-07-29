# Lassali Store

E-commerce de moda fitness da Lassali Store, com quatro experiências comerciais:

- varejo Lassali;
- atacado para empresas com CNPJ aprovado;
- varejo de produtos oficiais Forbody;
- portal corporativo para reposição das unidades Forbody.

## Stack

- Next.js 16, React 19 e TypeScript;
- Supabase Auth, Postgres e Storage;
- Mercado Pago;
- Melhor Envio;
- Vercel.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Segurança comercial

Preços de atacado e preços internos das unidades não devem ser enviados ao
navegador de visitantes comuns. A autorização é validada no servidor e reforçada
por Row Level Security no Supabase.

## Situação dos dados

Os produtos presentes no código são demonstrativos. O catálogo real poderá ser
cadastrado pelo painel ou importado por planilha quando os dados comerciais
estiverem disponíveis.
