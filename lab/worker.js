// STACK GTO ラボ: リバーをブラウザの中で解く(Web Worker)。
// solver.wasm = tools/gto/solver を wasm32-wasip1 にビルドしたもの(研究ブランチ claude/gto-extend-preflop-quo0aj)。
// 外へは何も送らない。必要な WASI の関数だけを、ここで小さく用意する(ファイルは使わない)。
importScripts("ranges.js");

function runSolver(bytes, args) {
  let mem = null, out = "", err = "";
  const dec = new TextDecoder(), enc = new TextEncoder();
  const view = () => new DataView(mem.buffer);
  const u8 = () => new Uint8Array(mem.buffer);
  class Exit extends Error { constructor(code) { super("exit " + code); this.code = code; } }
  const argv = ["solver", ...args].map((a) => enc.encode(a + "\0"));
  const EBADF = 8, ENOENT = 44, ENOSYS = 52;
  const wasi = {
    args_sizes_get(pc, ps) { view().setUint32(pc, argv.length, true); view().setUint32(ps, argv.reduce((s, a) => s + a.length, 0), true); return 0; },
    args_get(pp, pb) { let off = pb; argv.forEach((a, i) => { view().setUint32(pp + 4 * i, off, true); u8().set(a, off); off += a.length; }); return 0; },
    environ_sizes_get(pc, ps) { view().setUint32(pc, 0, true); view().setUint32(ps, 0, true); return 0; },
    environ_get() { return 0; },
    clock_time_get(id, prec, pt) { view().setBigUint64(pt, BigInt(Math.round(performance.now() * 1e6)), true); return 0; },
    random_get(p, n) { crypto.getRandomValues(u8().subarray(p, p + n)); return 0; },
    fd_write(fd, iovs, n, pw) {
      let total = 0;
      for (let i = 0; i < n; i++) {
        const ptr = view().getUint32(iovs + 8 * i, true), len = view().getUint32(iovs + 8 * i + 4, true);
        const s = dec.decode(u8().slice(ptr, ptr + len));
        if (fd === 1) out += s; else err += s;
        total += len;
      }
      view().setUint32(pw, total, true);
      return 0;
    },
    fd_prestat_get() { return EBADF; },
    fd_prestat_dir_name() { return EBADF; },
    fd_fdstat_get(fd, p) { if (fd > 2) return EBADF; u8().fill(0, p, p + 24); view().setUint8(p, 2); return 0; },
    fd_filestat_get() { return EBADF; },
    fd_close() { return 0; },
    fd_read() { return EBADF; },
    fd_seek() { return EBADF; },
    path_open() { return ENOENT; },
    path_filestat_get() { return ENOENT; },
    path_create_directory() { return ENOSYS; },
    proc_exit(code) { throw new Exit(code); },
  };
  return WebAssembly.instantiate(bytes, { wasi_snapshot_preview1: wasi }).then(({ instance }) => {
    mem = instance.exports.memory;
    try { instance.exports._start(); } catch (e) { if (!(e instanceof Exit) || e.code !== 0) return { error: (err || String(e)).slice(-400) }; }
    return { out, err };
  });
}

let wasmBytes = null;
self.onmessage = async (ev) => {
  const q = ev.data;
  try {
    if (!wasmBytes) wasmBytes = await (await fetch("solver.wasm")).arrayBuffer();
    const R = self.LAB_RANGES[q.range];
    const args = ["lab", "--board", q.board, "--pot", String(q.pot), "--stack", String(q.stack),
      "--oopbets", q.oopbets, "--bets", q.ipbets, "--raises", "3", "--raise-pot", "0.5,0.75,1", "--cap", "1", "--allin", "1",
      "--oop", "w:" + R.oop.join(","), "--ip", "w:" + R.ip.join(","), "--iters", String(q.iters)];
    const t = performance.now();
    const r = await runSolver(wasmBytes, args);
    if (r.error) { self.postMessage({ error: r.error }); return; }
    const data = JSON.parse(r.out);
    data.browserSeconds = (performance.now() - t) / 1000;
    self.postMessage({ data });
  } catch (e) { self.postMessage({ error: String(e && e.message || e) }); }
};
