# Deploy automático: GitHub + Vercel

## 1. Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome sugerido: `primecell`
3. **Não** marque "Add README" (o projeto já tem arquivos)
4. Crie o repositório

No terminal, na pasta do projeto:

```bash
cd d:\primecell
git init
git add .
git commit -m "PrimeCell: sistema completo + deploy Vercel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/primecell.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuário do GitHub.

## 2. Conectar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (pode usar conta GitHub)
2. **Add New… → Project**
3. Importe o repositório `primecell`
4. A Vercel detecta o `vercel.json` — mantenha as configurações
5. Em **Environment Variables**, adicione:

| Nome | Valor |
|------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(obrigatório — gere uma chave longa, ex. 64 caracteres aleatórios)* |

> Sem `JWT_SECRET`, o login pode falhar com "Erro na requisição".

6. Clique **Deploy**

### Atualizar após correções

```bash
git add .
git commit -m "fix: API Vercel login"
git push
```

A Vercel faz redeploy automático em alguns segundos.

## 3. Após o deploy

- URL: `https://primecell-xxx.vercel.app`
- Login: `admin` / `primecell123` — **altere a senha em Configurações**

## Importante — dados na Vercel

Na Vercel, o SQLite fica em armazenamento temporário (`/tmp`). Os dados podem **resetar** após inatividade ou novo deploy.

Para uso real em produção, use:

- **Docker + VPS** (veja [DEPLOY.md](../DEPLOY.md)), ou
- Migre o banco para [Turso](https://turso.tech) (SQLite na nuvem)

Faça backups regulares em **Configurações → Baixar backup**.
