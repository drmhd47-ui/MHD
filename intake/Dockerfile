# يُبنى من جذر المستودع: docker build -f intake/Dockerfile .
# المرحلة الأولى تبني فهرس الخدمات من كتالوج الموقع، فيبقى مصدراً واحداً.
FROM node:22-alpine AS catalog
WORKDIR /src/website
COPY website/package.json website/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY website/ ./
RUN npx astro build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY intake/package.json intake/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY intake/src ./src
COPY --from=catalog /src/website/dist/data/services.json ./catalog/services.json
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "src/server.js"]
