# يُبنى من جذر المستودع: docker build -f website/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /src/website
COPY website/package.json website/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY website/ ./
RUN npx astro build

FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/public/nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=build /src/website/dist /usr/share/nginx/html
EXPOSE 80 443
