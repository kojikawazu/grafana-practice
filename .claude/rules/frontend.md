---
description: Nuxt.js 3 フロントエンド設計・コンポーネント規約
globs: "apps/task-app/pages/**,apps/task-app/components/**,apps/task-app/composables/**,apps/task-app/layouts/**,apps/task-app/repositories/**,apps/task-app/types/**,apps/task-app/constants/**,apps/task-app/utils/**,apps/task-app/app.vue"
---

# フロントエンドルール（Nuxt.js 3）

> **本プロジェクトの位置づけ**: example アプリは「テレメトリを発生させる題材」であり、機能追加は最小限にとどめる（[`01-business-requirements.md`](../../docs/01-business-requirements.md)）。以下は画面・ロジックを追加する場合に従う規約であり、**現状 1 画面のためディレクトリが未作成のものも含む**。作る時点でこの配置に従う。

## ページ（pages/）は薄く保つ

- `pages/` のルートコンポーネントは**薄く**保つ。責務は「データ取得の起点・composable 呼び出し・レイアウト/メタ指定」に限定する。
- ビジネスロジック・複雑な状態管理・副作用を page に直接書かない → **composable へ切り出す**。
- ファイルベースルーティングを使用し、ルートを手動定義しない。

## composable / component の役割分離

「入口（page）＝薄い」「再利用ロジック（composable）」「見た目（component）」を明確に分ける。

- **ロジックは `composables/` に切り出す**（`useXxx`）。データ取得・状態・副作用・ドメイン処理はここに集約。Nuxt 3 の auto-import を活用（`composables/`, `utils/` は自動インポート対象）。
- **component は UI 描画に専念**（presentational）。共通 UI は `components/ui/`（Atoms）＋ `components/common/`（Molecules）、機能別は feature ディレクトリ（例: `components/task/`）。
- **composable の戻り値・`useState()` の共有状態には各メンバーにコメントを付ける**。auto-import される分、**定義ファイルを開かずに使われる度合いが特に高い**ため、コメントが唯一の説明になる。`useState('key', ...)` はキー名の意味と共有範囲を必ず書く（auto-import + 文字列キーで参照元が追いにくいため）。
- SFC 内に閉じた `ref` / `reactive`・ハンドラ関数は一律必須にしない（「なぜ」が非自明なときのみ）。

## 型定義

- 型は**原則 `type` を使う**。props・emits・API レスポンス型は `type` で定義する（`typescript.md`「type vs interface」）。
- 置き場所は**参照範囲**で決める。1 ファイル（SFC）に閉じる型（props / emits 型等）はコロケーション、2 箇所以上から参照される型は `types/` へ集約する（`typescript.md`「型定義の配置」）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない（`typescript.md`「定数の配置」）。

## 関心別にディレクトリを切る

`types/` `constants/` `repositories/` は**それぞれ独立したディレクトリ**として、Nuxt の規約ディレクトリと同じ階層（`apps/task-app/` 直下）に置く。いずれも**単一ファイルにまとめない**（`types.ts` / `utils/validation.ts` のような形は禁止。ドメイン単位でファイルを分ける）。

| ディレクトリ | 置くもの | 置かないもの |
|---|---|---|
| `types/` | 2 箇所以上から参照される型 | 値・ロジック |
| `constants/` | 全環境で不変な値 | 環境変数（`runtimeConfig` を使う）・型を導出する定数（`types/` 側へ） |
| `repositories/` | **API アクセス**（`$fetch` / `useFetch` のラッパ） | UI・画面都合の整形・業務判断 |
| `utils/` | **通信を持たない純粋ユーティリティ**（日付整形・計算等・auto-import） | API アクセス（`repositories/` へ）・定数・型 |

- **`$fetch` を書いてよいのは `repositories/` と `server/` だけ**。SFC・composables・`utils/` から直接叩かない。呼び出し口を 1 箇所に閉じることで、認証ヘッダ・エラー処理・リトライの実装が散らばらない。
  - **現状の逸脱**: [`pages/index.vue`](../../apps/task-app/pages/index.vue) が `useFetch` / `$fetch` を直接呼んでいる（1 画面のみの暫定実装）。2 画面目を追加する時点で `repositories/task.ts` へ切り出す。
- ディレクトリ名は**複数形で統一**する（`types` / `constants` / `repositories`）。
- `repositories/` は **Nuxt の auto-import 対象外**（規約ディレクトリではない）。明示的に import するか、`nuxt.config.ts` の `imports.dirs` に追加する。どちらにするかはプロジェクトで統一する。

## セキュリティ（Server API 経由）

- 外部 API 呼び出し・シークレット（API キー・トークン・**DB 接続情報**）を**クライアントから直接扱わない**。Nuxt の Server API（`server/`）を経由し、機密はサーバ側に閉じる（`api.md` 参照）。
- `runtimeConfig`（サーバ専用）と `runtimeConfig.public`（クライアント公開）を使い分ける。クライアントに渡すのは公開してよい値のみ。

## レイヤ依存の一方向ルール

**依存は上位から下位への一方向のみ**。下位レイヤが上位レイヤを import してはならない。**auto-import があるため import 文に現れず、逆流が起きても気づきにくい**。参照の向きを意識的に守る。

```
pages  →  components  →  composables  →  repositories  →  utils  →  types / constants
（画面合成）  （表示）     （ロジック）    （API アクセス） （純粋関数）    （最下層）
```

| レイヤ | 参照してよい | 参照禁止 |
|---|---|---|
| `pages/` | `components/`, `composables/`, `utils/`, `types/`, `constants/` | （なし。pages は誰からも参照されない） |
| `components/` | 下位の `components/`, `composables/`, `utils/`, `types/`, `constants/` | **`pages/`**, **`repositories/`**・`$fetch` の直接呼び出し（通信は composables 経由） |
| `composables/` | `repositories/`, `utils/`, `types/`, `constants/` | **`pages/`**, **`components/`**（テンプレートを持たない） |
| `repositories/` | `utils/`, `types/`, `constants/` | **`pages/`**, **`components/`**, **`composables/`** |
| `utils/` | `types/`, `constants/` | 上位レイヤすべて（`utils/` は通信もしない） |
| `types/` `constants/` | （原則どこにも依存しない） | 上位レイヤすべて |

- **`server/`（Server API）から `components/` `composables/` を参照しない**。サーバー層がクライアント層に依存してはならない（`api.md` 参照）。逆にクライアントから `server/` の実装を import しない（**DB 接続情報を含むコードがクライアントバンドルに混入する**）。共有してよいのは `types/` に置いた契約の型のみ。
- **`components/` 内も一方向**にする。`ui/`（Atoms）は `common/` や `{feature}/` を参照しない。

### 逆流したくなったら「共通化」で解決する

| 逆流したい理由 | 正しい解き方 |
|---|---|
| 上位の型・定数を下位でも使いたい | その型・定数を**`types/` `constants/` へ移動**し、上下双方がそこを参照する |
| 上位のロジックを下位でも使いたい | 共通処理を**下位の `composables/` または `utils/` へ抽出**し、双方から呼ぶ |
| 下位から上位の状態を変えたい | **呼ばない**。**`emit` で親に通知する**（イベントは上へ、props は下へ） |
| 子が親のレイアウトを知りたい | 知らせない。**props / slot で親が渡す** |

**レビュー観点**: 参照の向きを見る。下位レイヤのファイルに上位レイヤ（`pages/` / `components/`）の名前が現れていたら指摘する。クライアント側のコードが `server/` の実装を引き込んでいないか。

## 型の扱い（API の形を画面に持ち込まない）

Nuxt は `server/`（Server API）を持つため、**変換は Server API 側の責務**とする。

| 種類 | 役割 | 置き場所 |
|---|---|---|
| **API 契約の型** | Server API が返す形。**クライアントと Server API で共有**して 1 箇所定義にする | `types/` |
| **ビューモデル** | 画面が必要とする形。UI 要件で変わる | `types/`、単一画面用なら該当コンポーネントにコロケーション |

- **Server API が画面単位のレスポンス型を定義**し、その形に整形して返す（`api.md`「レスポンス整形」）。クライアント側で**再変換しない**（変換層を二重に置かない）。
- DB の生の行をクライアントまで運ばない。**整形は `server/` で完結させる**（実装例: `mapRow`）。
- 表示専用の整形（日付フォーマット・区分名の解決）は **computed** で行い、**API 契約の型に表示都合のフィールドを足さない**。
- 契約の型とビューモデルが完全に一致するなら同じ型を使ってよい。**表示都合の差が出た時点で分ける**（早すぎる抽象化を避ける）。

## ディレクトリ構成

Nuxt 3 の規約ディレクトリに従う（auto-import 前提）。**（現状）** は本リポジトリに実在するもの:

```
apps/task-app/
├── app.vue            # （現状）
├── pages/             # ファイルベースルーティング（薄い）（現状: index.vue のみ）
├── server/            # Server API — api.md 参照（現状）
├── components/        # ui/ common/ {feature}/
├── composables/       # ロジック（useXxx・auto-import）
├── repositories/      # API アクセス（$fetch はここだけ・ドメイン単位で分割）
├── utils/             # 純粋ユーティリティ（通信しない・auto-import）
├── constants/         # 共通定数（環境変数は置かない）
└── types/             # 型定義
```

## バリデーション

- **クライアント検証は UX のためのものであり、セキュリティ担保ではない**。Server API 側でも必ず検証する（信頼境界が違うため、この重複は必要 — `duplication.md`）。
- 検証を追加する場合のライブラリは Zod に統一する（`typescript.md`「スキーマバリデーション」）。同じ入力ルールなら Server API とスキーマを共有する。制約値だけでも定数で共有する。
