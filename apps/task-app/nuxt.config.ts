// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Nuxt の既定挙動を、この日付時点の仕様に固定する。
  // 未指定だと Nuxt の更新で既定値が変わりうるため、必ず明示する。
  compatibilityDate: "2025-01-01",

  // DevTools のオーバーレイは画面に常駐し、計測対象のノイズになるため無効化。
  devtools: { enabled: false },

  // Docker 上で `node .output/server/index.mjs` として起動するための Node サーバープリセット。
  // Nitro は同じコードから Vercel / Cloudflare 等の出力も作れるが、
  // ここは「素の Node プロセス」であることが重要 — OTel の自動計装は
  // Node の http / pg モジュールを実行時に patch する方式のため、
  // サーバーレス向けプリセットでは前提が変わる。
  nitro: {
    preset: "node-server",
  },
});
