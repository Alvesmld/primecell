# Deploy do PrimeCell

Guia para colocar o sistema no ar em produção. Há duas opções principais:

| Opção | Ideal para | Dificuldade |
|-------|------------|-------------|
| **Docker** | VPS, NAS, qualquer servidor com Docker | Mais fácil |
| **VPS manual** | DigitalOcean, Hostinger, Contabo, AWS EC2 | Média |

Em produção, **um único processo Node** serve a API (`/api`), os uploads (`/uploads`) e o site React (páginas).

---

## Antes do deploy

1. **Altere a senha padrão** após o primeiro login (`admin` / `primecell123`).
2. **Defina um `JWT_SECRET` forte** no arquivo `server/.env`.
3. Faça **backup** regular em Configurações → Baixar backup.

---

## Opção 1 — Docker (recomendado)

### Requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose instalados
- Porta `3001` livre (ou altere `HOST_PORT` no compose)

### Passos

```bash
# 1. Clone o projeto no servidor
cd /opt
git clone SEU_REPOSITORIO primecell
cd primecell

# 2. Configure variáveis de ambiente
cp server/.env.production.example server/.env
nano server/.env   # edite JWT_SECRET

# 3. Suba o container
docker compose up -d --build

# 4. Verifique
docker compose logs -f
curl http://localhost:3001/api/health
```

Acesse: **http://IP_DO_SERVIDOR:3001**

Na primeira execução, o banco e o usuário `admin` são criados automaticamente.

### Comandos úteis

```bash
docker compose ps          # status
docker compose restart     # reiniciar
docker compose down        # parar
docker compose logs -f     # logs
```

### Dados persistentes

Volumes Docker guardam:

- `primecell_data` → banco SQLite (`server/data`)
- `primecell_uploads` → fotos e arquivos (`server/uploads`)

---

## Opção 2 — VPS Linux (sem Docker)

### Requisitos no servidor

- Ubuntu 22.04+ (ou Debian)
- Node.js **22 LTS** ([nodejs.org](https://nodejs.org) ou `nvm install 22`)
- Nginx (proxy reverso + HTTPS)
- PM2 (manter o Node rodando)

### 1. Instalar dependências

```bash
sudo apt update
sudo apt install -y nginx git build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Publicar o código

```bash
cd /var/www
sudo git clone SEU_REPOSITORIO primecell
sudo chown -R $USER:$USER primecell
cd primecell

npm run install:all
cp server/.env.production.example server/.env
nano server/.env   # JWT_SECRET obrigatório
```

### 3. Build e seed

```bash
npm run build

# Primeira vez apenas — cria admin e dados demo
cd server && npm run seed:prod && cd ..
```

### 4. Iniciar com PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # siga as instruções para iniciar no boot
```

Teste: `curl http://127.0.0.1:3001/api/health`

### 5. Nginx + domínio

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/primecell
sudo nano /etc/nginx/sites-available/primecell   # troque SEU_DOMINIO.com
sudo ln -s /etc/nginx/sites-available/primecell /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com
```

Acesse: **https://seudominio.com**

### Atualizar após mudanças no código

```bash
cd /var/www/primecell
git pull
npm run install:all
npm run build
pm2 restart primecell
```

---

## Variáveis de ambiente (`server/.env`)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `NODE_ENV` | Sim (prod) | `production` |
| `PORT` | Não | Porta HTTP (padrão `3001`) |
| `JWT_SECRET` | **Sim** | Chave secreta do login |
| `JWT_EXPIRES_IN` | Não | Ex.: `7d` |
| `CORS_ORIGIN` | Não | Só se API e site estiverem em domínios diferentes |
| `CLIENT_DIST_PATH` | Não | Caminho do `client/dist` (PM2 já define) |

Gerar `JWT_SECRET`:

```bash
openssl rand -base64 48
```

---

## Testar build local (simular produção)

```bash
npm run install:all
cp server/.env.production.example server/.env
# Edite server/.env: NODE_ENV=production

npm run build
cd server && npm run seed:prod && npm run start
```

Abra **http://localhost:3001** (não use a porta 5173 do Vite).

---

## Firewall

Libere apenas o necessário:

```bash
# Com Nginx na frente
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Sem Nginx (só Docker na 3001)
sudo ufw allow 3001/tcp
```

---

## Backup em produção

1. **Pelo sistema:** Configurações → Baixar backup (JSON).
2. **No servidor:** copie as pastas:
   - `server/data/` (banco)
   - `server/uploads/` (arquivos)

Com Docker:

```bash
docker compose exec primecell tar -czf /tmp/backup.tar.gz -C /app/server data uploads
docker cp primecell:/tmp/backup.tar.gz ./backup-primecell.tar.gz
```

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Página em branco após deploy | Rode `npm run build` no client; confira `CLIENT_DIST_PATH` |
| `better-sqlite3` erro ao instalar | Instale `build-essential` (Linux) ou use a imagem Docker oficial |
| Login não funciona | Verifique `JWT_SECRET` no `.env` e reinicie o processo |
| Upload falha | Nginx: `client_max_body_size 12M;` (já no exemplo) |
| Esqueci a senha | Restaure backup ou rode seed em banco novo (apaga dados) |

---

## Hospedagens alternativas

- **Railway / Render / Fly.io:** use o `Dockerfile`; defina variáveis no painel; monte volume persistente para `data` e `uploads`.
- **Uso só na loja (LAN):** Docker na 3001; acesse `http://IP-DA-MAQUINA:3001` no Wi‑Fi local.

Para dúvidas específicas de um provedor (Hostinger, AWS, etc.), informe qual usa que detalhamos os passos.
