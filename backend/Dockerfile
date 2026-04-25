FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node prisma ./prisma
RUN npx prisma generate

COPY --chown=node:node . .

# root 権限での実行を避けるため非 root ユーザーに切り替え
USER node

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
