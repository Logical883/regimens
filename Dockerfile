# API-only image (frontend stays on Vercel).
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend ./backend
COPY database ./database
COPY scripts ./scripts

RUN npm run deploy:prepare

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "scripts/render-start.js"]
