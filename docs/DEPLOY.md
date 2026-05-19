# Deploy em produção — Faltas Bot

## Pré-requisitos

- Docker >= 24
- Docker Compose >= 2.20 (plugin `docker compose`, não o legado `docker-compose`)
- Acesso ao servidor por SSH
- Portas 3001 (ou a porta escolhida) liberada no firewall

---

## 1. Clonar o repositório no servidor

```bash
git clone <url-do-repositorio> faltas-bot
cd faltas-bot
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env   # ou vim, etc.
```

Preencha ao menos `POSTGRES_PASSWORD` com uma senha forte. Os demais valores
podem ficar com os padrões se você não tiver um banco externo.

Se usar um banco externo (Neon, Supabase, RDS, etc.), adicione ao `.env`:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

E remova (ou comente) as linhas `POSTGRES_*` do arquivo `.env` — o serviço
`db` do compose ainda vai subir, mas o app vai usar a URL externa.

---

## 3. Build e inicialização

```bash
docker compose up -d --build
```

O processo:
1. Faz build do client React (`npm run build`)
2. Monta a imagem do servidor com todas as dependências e o Chromium
3. Sobe o PostgreSQL, aguarda o healthcheck passar
4. Sobe o servidor Node.js

Primeira inicialização pode levar alguns minutos (download das imagens +
instalação das dependências do puppeteer).

---

## 4. Verificar se está rodando

```bash
# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver logs só do app
docker compose logs -f app

# Ver logs só do banco
docker compose logs -f db
```

---

## 5. Conectar o WhatsApp (QR code)

Após o servidor inicializar, o WhatsApp precisa ser autenticado pela primeira vez.

1. Abra a interface web: `http://<ip-do-servidor>:3001`
2. Navegue até a seção de WhatsApp / QR code
3. Escaneie o QR code com o WhatsApp do celular (Dispositivos conectados > Conectar dispositivo)

A sessão fica salva no volume Docker `wwebjs_auth`. Após autenticar, o QR code
não será pedido novamente, mesmo depois de restarts do container.

### Reconectar (se desconectar)

```bash
# Ver logs para acompanhar o status
docker compose logs -f app

# Se necessário, reiniciar apenas o app (o banco continua rodando)
docker compose restart app
```

Se o WhatsApp pedir um novo QR code, ele aparecerá na interface web.

---

## 6. Backup do banco de dados

```bash
# Dump completo
docker compose exec db pg_dump -U faltasbot faltasbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar a partir de um backup
docker compose exec -T db psql -U faltasbot faltasbot < backup_20240101_120000.sql
```

Automatize o backup com um cron no host:

```bash
# Editar crontab
crontab -e

# Backup diário às 3h da manhã
0 3 * * * cd /caminho/para/faltas-bot && docker compose exec -T db pg_dump -U faltasbot faltasbot > /backups/faltas_$(date +\%Y\%m\%d).sql 2>/dev/null
```

---

## 7. Atualizar a aplicação

```bash
# Buscar novo código
git pull

# Rebuild e restart (zero downtime não garantido — o app fica alguns segundos offline)
docker compose up -d --build app

# Verificar que subiu corretamente
docker compose logs -f app
```

---

## 8. Comandos úteis

```bash
# Parar tudo
docker compose down

# Parar tudo E remover volumes (CUIDADO: apaga banco e sessão WhatsApp)
docker compose down -v

# Abrir shell no container do app
docker compose exec app sh

# Abrir psql no banco
docker compose exec db psql -U faltasbot faltasbot

# Ver uso de espaço dos volumes
docker system df -v
```

---

## 9. Nginx como proxy reverso (opcional, recomendado para HTTPS)

Se quiser expor na porta 80/443 com SSL, configure o Nginx no host como proxy
para `localhost:3001`. Exemplo mínimo com Certbot:

```nginx
server {
    listen 80;
    server_name seudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
