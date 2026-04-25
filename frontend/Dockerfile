FROM node:20-slim
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node . .

# node_modules を含む全ファイルの所有者を node ユーザーに変更してから切り替え
RUN chown -R node:node /app
USER node

# Dockerコンテナ外からアクセスするために --host を指定
CMD ["npm", "run", "dev", "--", "--host"]
