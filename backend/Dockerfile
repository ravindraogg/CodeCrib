FROM node:20.11.1-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server.js ./
COPY Uploads ./Uploads

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]