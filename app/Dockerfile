# syntax=docker/dockerfile:1.7
#
# Single production container: nginx (:8080) → node server (127.0.0.1:3000)
# with the writer coordinator and Litestream. Built for linux/arm64 in CI;
# amd64 also works for local testing.

ARG NODE_IMAGE=node:24.14-bookworm-slim

# --- Build -----------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build \
 && npm prune --omit=dev

# --- Litestream (pinned, checksum-verified) --------------------------------
FROM debian:bookworm-slim AS litestream
ARG TARGETARCH
ARG LITESTREAM_VERSION=0.5.18
ARG LITESTREAM_SHA256_ARM64=922a09e6a7ac67f2095571894dc6382e94e1dd4cdd9674883ddf1a8e74ab982d
ARG LITESTREAM_SHA256_AMD64=d3687b9fd0f2e9426bbd3da828429ff3f1dfc5c9b74d54fdf028e4ee510e7dea
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
RUN set -eu; \
    case "$TARGETARCH" in \
      arm64) arch=arm64;  sum=$LITESTREAM_SHA256_ARM64 ;; \
      amd64) arch=x86_64; sum=$LITESTREAM_SHA256_AMD64 ;; \
      *) echo "unsupported arch $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    file="litestream-${LITESTREAM_VERSION}-linux-${arch}.tar.gz"; \
    curl -fsSL -o "/tmp/$file" "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/$file"; \
    echo "$sum  /tmp/$file" | sha256sum -c -; \
    tar -xzf "/tmp/$file" -C /usr/local/bin litestream; \
    /usr/local/bin/litestream version

# --- Runtime ---------------------------------------------------------------
FROM ${NODE_IMAGE}
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx tini ca-certificates \
 && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled /etc/nginx/conf.d/* \
 && mkdir -p /data \
 && chown node:node /data

COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

WORKDIR /app
COPY --from=build --chown=root:root /src/package.json ./
COPY --from=build --chown=root:root /src/node_modules ./node_modules
COPY --from=build --chown=root:root /src/build ./build
COPY --from=build --chown=root:root /src/drizzle ./drizzle

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=127.0.0.1 \
    DATA_DIR=/data \
    MIGRATIONS_DIR=/app/drizzle \
    LITESTREAM_BIN=/usr/local/bin/litestream \
    LITESTREAM_HEARTBEAT_URL=http://127.0.0.1:3000/_internal/litestream-heartbeat

# The app and nginx run unprivileged; the root filesystem can be read-only
# with /data and /tmp as writable volumes.
USER node
EXPOSE 8080
VOLUME ["/data", "/tmp"]
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["serve"]
