# syntax=docker/dockerfile:1

# ---- base: pnpm 有効化 ----
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---- build: 依存インストール + Nuxt ビルド ----
FROM base AS build
# ワークスペースのマニフェストのみ先に入れて依存解決をキャッシュ
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/task-app/package.json apps/task-app/package.json
RUN pnpm install --filter task-app...
# ソースを入れてビルド
COPY apps/task-app apps/task-app
RUN pnpm --filter task-app build

# ---- runtime: Nitro 出力 + OTel ブートストラップ + 依存 ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# node-linker=hoisted のため依存はフラットに /repo/node_modules へ集約される
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/task-app/.output ./.output
COPY --from=build /repo/apps/task-app/instrumentation.mjs ./instrumentation.mjs
EXPOSE 3000
# --import で instrumentation.mjs をアプリ本体より先に評価する。
# 自動計装は http / pg のモジュールを「読み込まれる前」に patch する必要があり、
# ここを外すとアプリは正常に動くのにスパンだけが一切出なくなる。
CMD ["node", "--import", "./instrumentation.mjs", ".output/server/index.mjs"]
