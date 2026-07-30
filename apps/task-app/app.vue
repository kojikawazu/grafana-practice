<!--
  アプリのルートコンポーネント。全ページ共通の入れ物になる。

  <NuxtPage /> は、現在の URL に対応する `pages/` 配下のコンポーネントが
  描画される差し込み口。この 1 行が無いとルーティングの結果が表示されない。

  レイアウト（ヘッダー・フッター等）を導入する場合は `layouts/default.vue` を作り、
  ここを <NuxtLayout><NuxtPage /></NuxtLayout> に置き換える。
-->
<template>
  <NuxtPage />
</template>
