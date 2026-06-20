-- task-app の初期スキーマ。
-- PostgreSQL コンテナの docker-entrypoint-initdb.d で初回起動時に適用される。
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid() 用

CREATE TABLE IF NOT EXISTS tasks (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text        NOT NULL,
    done        boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
