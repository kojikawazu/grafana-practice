<script setup lang="ts">
/**
 * タスク一覧画面（`/`）。
 *
 * このファイルが `/` になるのは **Nuxt のファイルベースルーティング**による。
 * `pages/index.vue` → `/`、`pages/tasks/[id].vue` → `/tasks/:id`。ルート定義を
 * 書く場所はどこにもなく、**ファイルの配置そのものがルート定義**である。
 *
 * 監視の観点では、この画面の操作がトレースの起点になる:
 *   ブラウザ操作 → /api/tasks（Nitro ハンドラのスパン） → pg のクエリスパン
 * という親子関係が自動計装により生成され、Tempo で 1 本のトレースとして見える。
 */

/**
 * API 契約の型。Server API が返す JSON の形と 1:1 で対応する。
 *
 * 現状この画面でしか使わないため**コロケーション**（このファイル内に定義）している。
 * 2 箇所目の参照が生まれた時点で `types/task.ts` へ昇格させる（`.claude/rules/typescript.md`）。
 * `createdAt` が `string` なのは、JSON には Date 型が無く ISO 文字列で運ばれるため。
 */
interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

/**
 * 一覧の初期取得。
 *
 * `useFetch` は `$fetch` と違い **SSR に統合**されている:
 *   1. サーバー側で実行して HTML を生成し、結果を payload に載せる
 *   2. ブラウザ側は payload を再利用し、**同じリクエストを二度投げない**（hydration）
 * そのため初期表示のデータ取得をここに書いてよい（`$fetch` だと二重取得になる）。
 *
 * `default: () => []` は取得前・失敗時の値。これが無いと `tasks` が `null` を取りうる型になり、
 * テンプレートの `tasks.length` が型エラーかつ実行時エラーになる。
 *
 * トップレベル `await` は `<script setup>` を非同期コンポーネント化する。Nuxt は SSR 時に
 * これを待ってから HTML を組み立てるため、**初期 HTML にタスク一覧が含まれた状態で返る**。
 */
const { data: tasks, refresh } = await useFetch<Task[]>("/api/tasks", {
  default: () => [],
});

/** 入力欄の値。単一値なので `ref`（`.value` で読み書きする） */
const newTitle = ref("");
/** 直近の操作エラー。成功時は空文字に戻し、表示を消す */
const errorMessage = ref("");
/** 追加処理の実行中フラグ。二重送信の抑止に使う */
const busy = ref(false);

/**
 * 追加ボタンの活性条件。
 * `computed` は依存する `ref` が変わったときだけ再計算され、結果はキャッシュされる。
 * ここで `trim()` しているのはサーバー側の検証（`normalizeTitle`）と揃えるためで、
 * **クライアント検証は UX 用**。空白のみの入力は最終的にサーバーが 400 で弾く。
 */
const canAdd = computed(() => newTitle.value.trim().length > 0 && !busy.value);

/**
 * タスクを追加する。
 *
 * 更新系は `useFetch` ではなく `$fetch` を使う。`useFetch` は「SSR とキャッシュに
 * 統合された取得」のための API であり、**ボタン押下で 1 回だけ実行したい副作用には向かない**
 * （キー単位のキャッシュ・重複排除が邪魔になる）。
 *
 * 成功後に `refresh()` で一覧を取り直しているのは、ローカル状態を手で書き換えると
 * サーバーの採番値（id / createdAt）とずれるため。**サーバーを単一の真実として扱う**。
 */
async function addTask() {
  if (!canAdd.value) return;
  errorMessage.value = "";
  busy.value = true;
  try {
    await $fetch("/api/tasks", {
      method: "POST",
      body: { title: newTitle.value },
    });
    newTitle.value = "";
    await refresh();
  } catch (e: any) {
    // Nitro の createError が返す statusMessage を表示に使う。
    // 詳細な内部エラーは 500 では返らない設計（server/utils/http.ts）。
    errorMessage.value = e?.statusMessage || "タスクの追加に失敗しました";
  } finally {
    // 例外の有無にかかわらずフラグを戻す。finally にしないと、
    // エラー時にボタンが無効のままになる。
    busy.value = false;
  }
}

/**
 * 完了状態を反転する。
 * 送るのは `done` のみ。PATCH は**変更したいフィールドだけを送る**メソッドであり、
 * サーバー側も渡されたキーだけを SET 句に組み立てる（`updateTask`）。
 */
async function toggle(task: Task) {
  errorMessage.value = "";
  try {
    await $fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { done: !task.done },
    });
    await refresh();
  } catch (e: any) {
    errorMessage.value = e?.statusMessage || "更新に失敗しました";
  }
}

/**
 * タスクを削除する。
 * サーバーは 204（本文なし）を返すため、戻り値は使わずに一覧を取り直す。
 */
async function remove(task: Task) {
  errorMessage.value = "";
  try {
    await $fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    await refresh();
  } catch (e: any) {
    errorMessage.value = e?.statusMessage || "削除に失敗しました";
  }
}
</script>

<template>
  <main class="page">
    <h1>タスク管理 <small>（OpenTelemetry example）</small></h1>

    <!--
      @submit.prevent = submit イベント + preventDefault()。
      これが無いとフォーム送信でページ全体がリロードされ、SPA の状態が失われる。
      button を type="submit" にしているため、Enter キーでも追加できる。
    -->
    <form class="add" @submit.prevent="addTask">
      <input
        v-model="newTitle"
        type="text"
        placeholder="新しいタスクを入力"
        aria-label="新しいタスク"
      />
      <button type="submit" :disabled="!canAdd">追加</button>
    </form>

    <!-- role="alert" でスクリーンリーダーに即時読み上げさせる（動的に現れるエラーのため） -->
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <ul class="list">
      <!--
        :key はリスト再描画時に Vue が要素を同一視するための識別子。
        index ではなく id を使う。index にすると並び替え・削除で
        入力状態やアニメーションが別の行にずれて引き継がれる。
      -->
      <li v-for="task in tasks" :key="task.id" :class="{ done: task.done }">
        <label>
          <!--
            v-model ではなく :checked + @change にしているのは、真の状態が
            サーバー側にあるため。楽観的にチェックを動かさず、API 成功後の
            refresh() で反映される（失敗すればチェックは元のまま）。
          -->
          <input
            type="checkbox"
            :checked="task.done"
            @change="toggle(task)"
          />
          <!-- {{ }} は自動で HTML エスケープされる。ここで v-html を使うと XSS になる -->
          <span class="title">{{ task.title }}</span>
        </label>
        <button class="del" type="button" @click="remove(task)">削除</button>
      </li>
      <li v-if="tasks.length === 0" class="empty">タスクはまだありません</li>
    </ul>
  </main>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 3rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  color: #1f2933;
}
h1 {
  font-size: 1.5rem;
}
h1 small {
  font-size: 0.8rem;
  color: #7b8794;
}
.add {
  display: flex;
  gap: 0.5rem;
  margin: 1.5rem 0;
}
.add input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd2d9;
  border-radius: 6px;
  font-size: 1rem;
}
.add button,
.del {
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1rem;
  cursor: pointer;
}
.add button {
  background: #2563eb;
  color: #fff;
}
.add button:disabled {
  background: #9fb3df;
  cursor: not-allowed;
}
.error {
  color: #b91c1c;
}
.list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e4e7eb;
  border-radius: 6px;
}
.list li.done .title {
  text-decoration: line-through;
  color: #9aa5b1;
}
.list label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}
.del {
  background: #f3f4f6;
  color: #b91c1c;
}
.empty {
  color: #9aa5b1;
  justify-content: center;
}
</style>
