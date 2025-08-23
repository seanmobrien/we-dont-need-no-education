# Rate retry configuration
ARG RATE_RETRY_INTERVAL_MINUTES=5
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG MEM0_APIHOST

FROM node:22-alpine AS base

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG MEM0_APIHOST

ENV PYTHONUNBUFFERED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs 

# Install all required dependencies in one layer
RUN apk add --no-cache \
    libc6-compat \
    dcron \
    curl \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    fontconfig-dev \
    freetype-dev \
    python3-dev \
    python3 \
    py3-pip \
    pixman \
  && ln -sf python3 /usr/bin/python

# Install dependencies only when needed
FROM base AS deps

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG MEM0_APIHOST

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY --link=true package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM deps AS builder

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG MEM0_APIHOST

WORKDIR /app

COPY --link=true --chown=nextjs:nodejs --from=deps /app/node_modules ./node_modules
COPY --link=true --chown=nextjs:nodejs ./app ./app
COPY --link=true --chown=nextjs:nodejs ./components ./components
COPY --link=true --chown=nextjs:nodejs ./data-models ./data-models
COPY --link=true --chown=nextjs:nodejs ./drizzle ./drizzle
COPY --link=true --chown=nextjs:nodejs ./lib ./lib
COPY --link=true --chown=nextjs:nodejs ./types ./types
COPY --link=true --chown=nextjs:nodejs ./instrument ./instrument
COPY --link=true --chown=nextjs:nodejs ./scripts ./scripts
COPY --link=true --chown=nextjs:nodejs ./*.ts ./*.mjs ./*.json ./*.lock ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES
ENV RATE_RETRY_INTERVAL_MINUTES=$RATE_RETRY_INTERVAL_MINUTES
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=$NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ENV MEM0_APIHOST=$MEM0_APIHOST
ENV FOR_STANDALONE=1
ENV IS_BUILDING=1

RUN \
  --mount=type=secret,id=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,env=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING \
  printf "NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING=%s\nAZURE_MONITOR_CONNECTION_STRING=%s\n" "$NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING" "$NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING" > .env \
  && cat .env

RUN \
  --mount=type=secret,id=NEXT_PUBLIC_MUI_LICENSE,env=NEXT_PUBLIC_MUI_LICENSE \
  --mount=type=secret,id=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,env=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING \
  --mount=type=secret,id=REDIS_URL,env=REDIS_URL \
  --mount=type=secret,id=REDIS_PASSWORD,env=REDIS_PASSWORD \
  --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner

ARG RATE_RETRY_INTERVAL_MINUTES
ARG NEXT_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_LOG_LEVEL_CLIENT
ARG NEXT_PUBLIC_DEFAULT_AI_MODEL
ARG NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=300000
ARG OTEL_SERVICE_NAME
ARG OTEL_RESOURCE_ATTRIBUTES
ARG MEM0_APIHOST

LABEL co.obapps.vendor="OBrien Appplications"
LABEL co.obapps.name="Compliance Tracker Web UI"
LABEL org.opencontainers.image.description="A web UI for the Compliance Tracker application, which helps users track and manage compliance issues in educational institutions."
LABEL org.opencontainers.image.authors="stopbullyingpriorlake@gmail.com"  
LABEL org.opencontainers.image.licenses="EJL-1.0"

WORKDIR /app

ENV NODE_ENV=production
ENV FOR_STANDALONE=1
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME
ENV OTEL_RESOURCE_ATTRIBUTES=$OTEL_RESOURCE_ATTRIBUTES
ENV NEXT_PUBLIC_HOSTNAME=$NEXT_PUBLIC_HOSTNAME
ENV NEXT_PUBLIC_LOG_LEVEL_CLIENT=$NEXT_PUBLIC_LOG_LEVEL_CLIENT
ENV NEXT_PUBLIC_DEFAULT_AI_MODEL=$NEXT_PUBLIC_DEFAULT_AI_MODEL
ENV NEXT_TELEMETRY_DISABLED=1
ENV RATE_RETRY_INTERVAL_MINUTES=$RATE_RETRY_INTERVAL_MINUTES
ENV NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT=$NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT
ENV MEM0_APIHOST=$MEM0_APIHOST
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Automatically leverage output traces to reduce image size

COPY --link=true --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --link=true --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --link=true --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy rate retry script
COPY --link=true --from=builder --chown=nextjs:nodejs /app/scripts/rate-retry-client.sh ./scripts/
RUN chmod +x ./scripts/rate-retry-client.sh

# Set up cron for rate retry processing
RUN echo "*/$RATE_RETRY_INTERVAL_MINUTES * * * * /app/scripts/rate-retry-client.sh --host http://localhost:3000 --log-file /var/log/rate-retry.log" > /etc/crontabs/nextjs
RUN crontab -u nextjs /etc/crontabs/nextjs

# Ensure log directory exists
RUN mkdir -p /var/log && chown nextjs:nodejs /var/log

USER nextjs

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
# Start cron daemon and then start the Next.js server
CMD ["sh", "-c", "crond -f -d 8 & node server.js"]