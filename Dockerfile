# =============================================================================
# RAF - Image du site (vitrine prerendue + back-office), servie par Node.
#
# Le build Angular regroupe tout ce dont le serveur a besoin dans dist/ : l'image
# finale ne contient ni node_modules ni les sources.
# =============================================================================

FROM node:24-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build --force

FROM node:24-alpine
WORKDIR /app

COPY --from=build --chown=node:node /build/dist/raf-ssr ./dist/raf-ssr
USER node

ENV NODE_ENV=production \
    PORT=4000
EXPOSE 4000

CMD ["node", "dist/raf-ssr/server/server.mjs"]
