FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN NODE_OPTIONS='--max-old-space-size=8192' npm run build

FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --only=production
COPY --from=build /app/dist ./

EXPOSE 3000
CMD ["node", "src/app/index.js"]