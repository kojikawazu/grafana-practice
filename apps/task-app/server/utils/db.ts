import { Pool } from "pg";

/**
 * 共有 PostgreSQL コネクションプール。
 * 接続情報は pg 標準の環境変数（PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE）から読む。
 * 遅延初期化することで、テスト（pg-mem）側は本モジュールに依存せず Queryable を差し替えられる。
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool();
  }
  return pool;
}
