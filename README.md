# PrimeCell — Sistema de Gestão

Sistema web para gestão de assistência técnica de celulares (finanças, serviços e clientes).

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4 + Recharts + Lucide
- **Backend:** Node.js + Express + SQLite
- **Auth:** JWT

## Deploy em produção

| Plataforma | Guia |
|------------|------|
| **GitHub + Vercel** | [.github/DEPLOY_VERCEL.md](./.github/DEPLOY_VERCEL.md) |
| **Docker / VPS** | [DEPLOY.md](./DEPLOY.md) |

Resumo rápido com Docker:

```bash
cp server/.env.production.example server/.env   # edite JWT_SECRET
docker compose up -d --build
# Acesse http://localhost:3001
```

---

## Desenvolvimento local

### 1. Backend

```bash
cd server
cp .env.example .env
npm run seed
npm run dev
```

API em `http://localhost:3001`

### 2. Frontend

```bash
cd client
npm run dev
```

App em `http://localhost:5173`

## Login padrão

- **Usuário:** `admin`
- **Senha:** `primecell123`

> Em produção, altere a senha imediatamente em Configurações.

## Abas implementadas

- ✅ Dashboard — resumo, gráficos, últimos serviços, garantias
- ✅ Finanças — gastos, receitas avulsas, filtros, gráficos, exportação PDF
- ✅ Serviços — CRUD completo, garantia, parcelas, uploads, PDF ordem/garantia
- ✅ Clientes — cadastro, histórico, total gasto, WhatsApp
- ✅ Configurações — loja, senha, logo, termo de garantia, backup/restauração
