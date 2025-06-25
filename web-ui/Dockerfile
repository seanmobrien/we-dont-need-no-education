ARG NEXT_PUBLIC_HOSTNAME
# Log level for traces on the client side
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT="info"
# Data Grid cache timeout (default 5 minutes)
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000 
# Data AI chat model
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL="hifi"
# The name of the service for OpenTelemetry
ARG OTEL_SERVICE_NAME="sue-the-schools-webui"
ARG OTEL_RESOURCE_ATTRIBUTES="service.name=sue-the-schools-webui,service.version=1.0.0"

FROM node:22-alpine AS base

ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES

# Install dependencies only when needed
FROM base AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY --link=true package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES

# Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

COPY --link=true --from=deps /app/node_modules ./node_modules
COPY --link=true ./app ./app
COPY --link=true ./components ./components
COPY --link=true ./data-models ./data-models
COPY --link=true ./drizzle ./drizzle
COPY --link=true ./lib ./lib
COPY --link=true ./types ./types
COPY --link=true ./*.ts ./*.mjs ./*.json ./*.lock ./

ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES

ENV FOR_STANDALONE=1
ENV IS_BUILDING=1

RUN printf "NEXT_PUBLIC_HOSTNAME=%s\r\nNEXT_PUBLIC_LOG_LEVEL_CLIENT=%s\r\nNEXT_PUBLIC_DEFAULT_AI_MODEL=%s\r\n" "$NEXT_PUBLIC_HOSTNAME" "$NEXT_PUBLIC_LOG_LEVEL_CLIENT" "$NEXT_PUBLIC_DEFAULT_AI_MODEL" > .env \
  && cat .env

RUN \
  --mount=type=secret,id=NEXT_PUBLIC_MUI_LICENSE,env=NEXT_PUBLIC_MUI_LICENSE \
  --mount=type=secret,id=NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING,env=NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner

LABEL co.obapps.vendor="OBrien Appplications"
LABEL co.obapps.name="Compliance Tracker Web UI"
LABEL org.opencontainers.image.description="A web UI for the Compliance Tracker application, which helps users track and manage compliance issues in educational institutions."
LABEL org.opencontainers.image.authors="stopbullyingpriorlake@gmail.com"  
LABEL org.opencontainers.image.licenses="EJL-1.0"

WORKDIR /app

ENV NODE_ENV=production
ENV FOR_STANDALONE=1
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --link=true --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --link=true --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --link=true --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]