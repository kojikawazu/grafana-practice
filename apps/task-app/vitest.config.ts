import { defineConfig } from "vitest/config";

/**
 * Vitest 設定。
 *
 * Nuxt のテストユーティリティ（@nuxt/test-utils）は使わず、素の Vitest で動かしている。
 * 対象がビジネスロジック（`server/utils/tasks.ts`）に閉じており、Nuxt の
 * ランタイム・auto-import を必要としないため。コンポーネントテストを追加する
 * 時点で環境を分ける（`environment: "happy-dom"` 等）。
 */
export default defineConfig({
  test: {
    // ブラウザ API を使わないため node 環境。DOM をエミュレートしない分だけ速い。
    environment: "node",
    // テストは tests/ に集約する方針（`.claude/rules/testing.md`）。
    // ソースツリー側の *.test.ts を拾わないよう、対象を明示的に絞る。
    include: ["tests/**/*.test.ts"],
  },
});
