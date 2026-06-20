// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },
  // Docker 上で `node .output/server/index.mjs` として起動するための Node サーバープリセット
  nitro: {
    preset: "node-server",
  },
});
