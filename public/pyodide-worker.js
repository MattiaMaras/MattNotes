/* eslint-disable */
/**
 * Pyodide Web Worker — runs the user's Python off the main thread.
 *
 * Pyodide (CPython compiled to WebAssembly) is loaded from the jsDelivr CDN via
 * `importScripts` rather than bundled with npm: the WASM payload is ~10 MB and
 * Turbopack doesn't need to know about it. The worker stays idle until the first
 * `run` message, then loads the runtime once and reuses it for every run.
 *
 * Message protocol (main thread → worker):
 *   { type: "run", id, code }
 * Replies (worker → main thread):
 *   { type: "ready" }                              once the runtime finishes loading
 *   { type: "loading" }                            ack that loading has started
 *   { type: "result", id, stdout, stderr, error }  after a run
 */

const PYODIDE_VERSION = "0.28.3";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;

importScripts(`${CDN}pyodide.js`);

async function getPyodide() {
  if (!pyodidePromise) {
    self.postMessage({ type: "loading" });
    pyodidePromise = self
      .loadPyodide({ indexURL: CDN })
      .then((py) => {
        self.postMessage({ type: "ready" });
        return py;
      })
      .catch((err) => {
        // Reset so a later run can retry after a transient CDN/network failure.
        pyodidePromise = null;
        throw err;
      });
  }
  return pyodidePromise;
}

async function run(id, code) {
  let stdout = "";
  let stderr = "";
  try {
    const py = await getPyodide();

    // Capture stdout/stderr by streaming them into JS strings.
    py.setStdout({ batched: (s) => (stdout += s + "\n") });
    py.setStderr({ batched: (s) => (stderr += s + "\n") });

    // Auto-install any pure-Python / wheel packages the snippet imports
    // (numpy, sympy, pandas, …) before executing it.
    await py.loadPackagesFromImports(code);

    await py.runPythonAsync(code);

    self.postMessage({ type: "result", id, stdout, stderr, error: null });
  } catch (err) {
    self.postMessage({
      type: "result",
      id,
      stdout,
      stderr,
      error: err && err.message ? err.message : String(err),
    });
  }
}

self.onmessage = (e) => {
  const data = e.data;
  if (data && data.type === "run") {
    run(data.id, data.code);
  }
};
