# STACK GTO ラボ(試作)

- `river.html`: 2人のリバーを、この端末の中で解いて、手ごとの打ち方と「証明」(最善の相手に余分に取られる量)を出すページ。ログインなし・検索に出さない(noindex)。ゲーム本体・GS2 には触れない
- `solver.wasm`: 研究ブランチ `claude/gto-extend-preflop-quo0aj` の `tools/gto/solver`(コミット 37383488)を wasm32-wasip1 にビルドしたもの(LTO・strip)。sha256 の先頭 2d84eb664cdd2948
  - 作り方: `CARGO_PROFILE_RELEASE_LTO=fat CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 CARGO_PROFILE_RELEASE_PANIC=abort CARGO_PROFILE_RELEASE_STRIP=true cargo build --release --offline --target wasm32-wasip1`
- `worker.js`: 必要な WASI の関数だけの小さな実装(ファイル・通信は使わない)と、ソルバーの呼び出し
- `ranges.js`: C1 のモデルのレンジ(`tools/gto/ranges/c1-*.json`)
- 設計: `tools/gto/DESIGN_PRESOLVED_LIBRARY_20261123.md`(研究ブランチ)
- `library.html`・`lib/`: 前もって解いたフロップとターン(研究ブランチの `tools/gto/uimenu/make_lab_library.py` で作る)。`lib/` は1回レイズのポット(9盤面・ターンは各盤面の多い3〜4線 × 6枚)、`lib/3bp/` は3ベットのポット(`--pot 3bp`。9盤面・まとめなし・ターンは多い2線 × 6枚)。ページの「ポットの形」で選ぶ
