# גלובוס — geography games for the team.
#
#   docker build -t geo-games .
#   docker run -d -p 3000:3000 -v geo-scores:/app/data --name geo-games geo-games
#
# On a network with no internet, point the build at what is there:
#   docker build -t geo-games \
#     --build-arg NODE_IMAGE=registry.local/library/node:24.1.0-slim \
#     --build-arg NPM_REGISTRY=https://npm.local/ .
# If that mirror's certificate is signed by an internal CA, hand the CA in as
# a build secret (it is used by npm and never stored in the image):
#     --secret id=npm_ca,src=/path/to/internal-ca.crt
# A proxy, if any, goes in the standard build args (HTTPS_PROXY, NO_PROXY).
#
# The app itself never reaches outside: country data, flags and fonts are in
# public/, and the server has no dependencies.

ARG NODE_IMAGE=node:24.1.0-slim

# ---- Build: install, test, and export the static site to out/ ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# An internal npm mirror, if there is one. npm swaps the public registry in
# package-lock.json for the configured one, so the lockfile stays as it is.
ARG NPM_REGISTRY=
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca,required=false \
    if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
 && if [ -s /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi \
 && npm ci --no-audit --no-fund

COPY . .
RUN npm test && npm run build

# ---- Run: Node, the site and serve.mjs; no node_modules ----
FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    GEO_DATA_DIR=/app/data

COPY --from=build --chown=node:node /app/out ./out
COPY --from=build --chown=node:node /app/serve.mjs ./serve.mjs
# The team table's results (data/scores.json). Mount a volume here, or they
# are lost when the container is replaced.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "serve.mjs", "out"]
