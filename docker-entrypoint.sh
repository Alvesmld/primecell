#!/bin/sh
set -e

cd /app/server

if [ ! -f data/primecell.db ]; then
  echo "Primeira execução: criando banco e usuário admin..."
  node dist/seed.js
fi

exec node dist/index.js
