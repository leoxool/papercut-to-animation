# 后端 Dockerfile (Node.js)
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 3002 8080

# 启动脚本：同时运行 API 和 WebSocket
CMD node api-server.js & node websocket-server.js & wait