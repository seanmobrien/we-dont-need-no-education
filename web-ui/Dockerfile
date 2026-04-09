# syntax=docker/dockerfile:1.7

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_FLAGSMITH_API_URL
ARG NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID
ARG NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG AZURE_OPENAI_ENDPOINT
ARG AZURE_AISEARCH_ENDPOINT
ARG AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ARG AZURE_AISEARCH_POLICY_INDEX_NAME
ARG AZURE_STORAGE_CONNECTION_STRING
ARG AZURE_STORAGE_ACCOUNT_NAME
ARG MEM0_API_HOST
ARG MEM0_UI_HOST
ARG MEM0_USERNAME
ARG BUILD_CACHE

FROM node:25-bookworm AS base

FROM base AS base_builder

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_FLAGSMITH_API_URL
ARG NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ARG NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG AZURE_OPENAI_ENDPOINT
ARG AZURE_AISEARCH_ENDPOINT
ARG AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ARG AZURE_AISEARCH_POLICY_INDEX_NAME
ARG AZURE_STORAGE_CONNECTION_STRING
ARG AZURE_STORAGE_ACCOUNT_NAME
ARG MEM0_API_HOST
ARG MEM0_UI_HOST
ARG MEM0_USERNAME
ARG BUILD_CACHE

ENV PYTHONUNBUFFERED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Build deps needed for native modules during yarn install (canvas/sharp toolchain)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg62-turbo-dev \
    libgif-dev \
    libpixman-1-dev \
    libfreetype6-dev \
    libfontconfig1-dev \
    pkg-config \
    python3 \
    python3-dev \
    python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS pruner

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /repo

# Copy workspace to compute prune graph
COPY --link=true . .

# Install turbo CLI for pruning (small global install avoids full node_modules)
#   then produce a pruned workspace for the app package
RUN npm install -g turbo@^2.8.3 && \
  turbo prune --scope=@compliance-theater/app --docker && \
  node -e "const fs=require('fs'); for (const file of ['out/full/package.json','out/json/package.json']) { const pkg=JSON.parse(fs.readFileSync(file,'utf8')); if (pkg.scripts?.preinstall) { delete pkg.scripts.preinstall; if (Object.keys(pkg.scripts).length===0) delete pkg.scripts; } fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n'); }" && \
  find out/full out/json -name '*.tsbuildinfo' -delete && \
  cp tsconfig.*.json out/full && \
  cp tsconfig.*.json out/json && \
  mkdir -p out/full/web-ui out/json/web-ui && \
  cp web-ui/tsconfig.*.json out/full/web-ui && \
  cp web-ui/tsconfig.*.json out/json/web-ui && \
  cp -R web-ui/eslint-rules out/full/web-ui/

# Dependencies layer uses pruned workspace
FROM base_builder AS deps

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Copy pruned package manifests and lockfile
COPY --link=true --from=pruner /repo/out/json/ ./

RUN node .yarn/releases/yarn-4.12.0.cjs install 
 # && cd /app/submodules/sce \
 # && node .yarn/releases/yarn-4.12.0.cjs install \
 # && cd /app

# Build layer with pruned source
FROM base_builder AS builder_root

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_FLAGSMITH_API_URL
ARG NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG AZURE_OPENAI_ENDPOINT
ARG AZURE_AISEARCH_ENDPOINT
ARG AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ARG AZURE_AISEARCH_POLICY_INDEX_NAME
ARG AZURE_STORAGE_CONNECTION_STRING
ARG AZURE_STORAGE_ACCOUNT_NAME
ARG MEM0_API_HOST
ARG MEM0_UI_HOST
ARG MEM0_USERNAME
ARG BUILD_CACHE

WORKDIR /app

COPY --link=true --from=deps /app/ ./
COPY --link=true --from=pruner /repo/out/full/ ./
# RUN rm -rf /app/web-ui/submodules/sce/.yarn \
#  && rm -rf /app/web-ui/submodules/sce/yarn.lock \
#  && rm -rf /app/web-ui/submodules/sce/.yarnrc.yml;

ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
ENV AZURE_AISEARCH_ENDPOINT=$AZURE_AISEARCH_ENDPOINT
ENV AZURE_AISEARCH_DOCUMENTS_INDEX_NAME=$AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ENV AZURE_AISEARCH_POLICY_INDEX_NAME=$AZURE_AISEARCH_POLICY_INDEX_NAME
ENV AZURE_STORAGE_CONNECTION_STRING=$AZURE_STORAGE_CONNECTION_STRING
ENV AZURE_STORAGE_ACCOUNT_NAME=$AZURE_STORAGE_ACCOUNT_NAME
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES
ENV RATE_RETRY_INTERVAL_MINUTES=$RATE_RETRY_INTERVAL_MINUTES
ENV MEM0_API_HOST=$MEM0_API_HOST
ENV MEM0_UI_HOST=$MEM0_UI_HOST
ENV MEM0_USERNAME=$MEM0_USERNAME
ENV IS_BUILDING=1
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=$NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ENV NEXT_PUBLIC_FLAGSMITH_API_URL=$NEXT_PUBLIC_FLAGSMITH_API_URL
ENV NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID=$NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME

RUN --mount=type=secret,id=env_file \
  --mount=type=secret,id=NEXT_PUBLIC_MUI_LICENSE \
  --mount=type=secret,id=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING \
  --mount=type=secret,id=AZURE_MONITOR_CONNECTION_STRING \
  --mount=type=secret,id=REDIS_URL \
  --mount=type=secret,id=REDIS_PASSWORD \
  --mount=type=secret,id=DATABASE_URL \
  --mount=type=secret,id=AZURE_API_KEY \
  --mount=type=secret,id=AZURE_AISEARCH_KEY \
  --mount=type=secret,id=AUTH_GOOGLE_SECRET \
  --mount=type=secret,id=AUTH_GOOGLE_APIKEY \
  --mount=type=secret,id=AZURE_STORAGE_ACCOUNT_KEY \
  --mount=type=secret,id=AZURE_STORAGE_CONNECTION_STRING \
  --mount=type=secret,id=AUTH_GOOGLE_ID \
  --mount=type=secret,id=OPENID_KEY_TEXT \
  --mount=type=secret,id=FLAGSMITH_SDK_KEY \
  SECRETS=/run/secrets; \
  TMP_ENV="$(mktemp)"; \
  add_var() { name="$1"; value="$2"; [ -n "$value" ] && printf "%s=%s\n" "$name" "$value" >> "$TMP_ENV"; }; \
  read_secret() { name="$1"; file="$2"; eval "current=\${$name:-}"; [ -z "$current" ] && current="$(cat "$file" 2>/dev/null || true)"; add_var "$name" "$current"; }; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      cron \
      curl && \
    rm -rf /var/lib/apt/lists/* && \
  if [ -f "$SECRETS/env_file" ]; then \
    cp "$SECRETS/env_file" "$TMP_ENV"; \
  else \
    read_secret NEXT_PUBLIC_MUI_LICENSE "$SECRETS/NEXT_PUBLIC_MUI_LICENSE"; \
    read_secret AZURE_MONITOR_CONNECTION_STRING "$SECRETS/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"; \
    read_secret NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING "$SECRETS/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"; \
    read_secret AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING "$SECRETS/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"; \
    read_secret NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING "$SECRETS/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"; \
    read_secret DATABASE_URL "$SECRETS/DATABASE_URL"; \
    read_secret AZURE_STORAGE_ACCOUNT_KEY "$SECRETS/AZURE_STORAGE_ACCOUNT_KEY"; \
    read_secret AZURE_STORAGE_CONNECTION_STRING "$SECRETS/AZURE_STORAGE_CONNECTION_STRING"; \
    read_secret AUTH_GOOGLE_ID "$SECRETS/AUTH_GOOGLE_ID"; \
    read_secret OPENID_KEY_TEXT "$SECRETS/OPENID_KEY_TEXT"; \
    read_secret REDIS_URL "$SECRETS/REDIS_URL"; \
    read_secret REDIS_PASSWORD "$SECRETS/REDIS_PASSWORD"; \
    read_secret AZURE_API_KEY "$SECRETS/AZURE_API_KEY"; \
    read_secret AZURE_AISEARCH_KEY "$SECRETS/AZURE_AISEARCH_KEY"; \
    read_secret AUTH_GOOGLE_SECRET "$SECRETS/AUTH_GOOGLE_SECRET"; \
    read_secret AUTH_GOOGLE_APIKEY "$SECRETS/AUTH_GOOGLE_APIKEY"; \
    read_secret FLAGSMITH_SDK_KEY "$SECRETS/FLAGSMITH_SDK_KEY"; \
  fi; \
  set -a; [ -f "$TMP_ENV" ] && . "$TMP_ENV"; set +a; \
  cp "$TMP_ENV" ./web-ui/packages/app/.env.local; \
  cp "$TMP_ENV" ./web-ui/packages/app/.env.production.local;

FROM builder_root AS builder

RUN node .yarn/releases/yarn-4.12.0.cjs build:publish && \
  rm -f "$TMP_ENV" ./web-ui/packages/app/.env.local ./web-ui/packages/app/.env.production.local

FROM base AS runner

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG AZURE_OPENAI_ENDPOINT
ARG AZURE_AISEARCH_ENDPOINT
ARG AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ARG AZURE_AISEARCH_POLICY_INDEX_NAME
ARG AZURE_STORAGE_CONNECTION_STRING
ARG AZURE_STORAGE_ACCOUNT_NAME
ARG MEM0_API_HOST
ARG MEM0_UI_HOST
ARG MEM0_USERNAME

LABEL co.obapps.vendor="OBrien Applications"
LABEL co.obapps.name="Compliance Tracker Web UI"
LABEL org.opencontainers.image.description="A web UI for the Compliance Tracker application."
LABEL org.opencontainers.image.authors="stopbullyingpriorlake@gmail.com"
LABEL org.opencontainers.image.licenses="EJL-1.0"

ENV AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
ENV AZURE_AISEARCH_ENDPOINT=$AZURE_AISEARCH_ENDPOINT
ENV AZURE_AISEARCH_DOCUMENTS_INDEX_NAME=$AZURE_AISEARCH_DOCUMENTS_INDEX_NAME
ENV AZURE_AISEARCH_POLICY_INDEX_NAME=$AZURE_AISEARCH_POLICY_INDEX_NAME
ENV AZURE_STORAGE_ACCOUNT_NAME=$AZURE_STORAGE_ACCOUNT_NAME
ENV RATE_RETRY_INTERVAL_MINUTES=$RATE_RETRY_INTERVAL_MINUTES
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV MEM0_API_HOST=$MEM0_API_HOST
ENV MEM0_UI_HOST=$MEM0_UI_HOST
ENV MEM0_USERNAME=$MEM0_USERNAME
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs --shell /bin/sh nextjs \
  && mkdir -p /app/scripts \
  && chown -R nextjs:nodejs /app \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
      cron \
      curl \
      libcairo2 \
      libpango-1.0-0 \
      libjpeg62-turbo \
      libgif7 \
      libfontconfig1 \
      libfreetype6 \
      libpixman-1-0 \
  && rm -rf /var/lib/apt/lists/*

# Copy the pruned monorepo runtime plus built assets and root node_modules so the
# app can be launched with `next start` rather than relying on standalone output.
COPY --link=true --from=builder /app/node_modules /app/node_modules
COPY --link=true --from=builder /app/web-ui /app/web-ui
# Copy startup and cron scripts from the app workspace.  rate-retry-client.sh is invoked
# by the cron job configured below and expects to live at /app/scripts/.
COPY --link=true --from=pruner /repo/web-ui/packages/app/scripts /app/scripts

# Set up cron and write runtime env file (pulling from secrets when env is unset)
RUN echo "*/$RATE_RETRY_INTERVAL_MINUTES * * * * /app/scripts/rate-retry-client.sh --host http://localhost:3000 --log-file /var/log/rate-retry.log" > /tmp/nextjs.cron 
RUN crontab -u nextjs /tmp/nextjs.cron 
RUN  rm -f /tmp/nextjs.cron 
RUN mkdir -p /var/log 
RUN chown nextjs:nodejs /var/log 
#RUN chown -R nextjs:nodejs /app 
RUN find /app/scripts -type f -name '*.sh' -exec chmod +x {} + || true;

WORKDIR /app/web-ui/packages/app

EXPOSE 3000
EXPOSE 9229

CMD ["sh", "-c", "cron && if [ \"$RUN_DEBUGGER\" = \"1\" ]; then su nextjs -s /bin/sh -c \"node --inspect-brk=0.0.0.0:9229 ../../../node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0\"; else su nextjs -s /bin/sh -c \"node ../../../node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0\"; fi"]
