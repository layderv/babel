import cp from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import * as babel from "../../lib/index.js";

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));

// "minNodeVersion": "10.0.0" <-- For Ctrl+F when dropping node 10
export const supportsESM = parseInt(process.versions.node) >= 12;

export const outputType = (() => {
  try {
    return fs
      .readFileSync(
        new URL("../../../../.module-type", import.meta.url),
        "utf-8",
      )
      .trim();
  } catch (_) {
    return "script";
  }
})();

export const isMJS = file => path.extname(file) === ".mjs";

export const itESM = supportsESM ? it : it.skip;

export function skipUnsupportedESM(name) {
  if (!supportsESM) {
    console.warn(
      `Skipping "${name}" because native ECMAScript modules are not supported.`,
    );
    return true;
  }
  return false;
}

export function loadOptionsAsync({ filename, cwd = dirname }, mjs) {
  if (mjs) {
    // import() crashes with jest
    return spawn("load-options-async", filename, cwd);
  }

  return babel.loadOptionsAsync({ filename, cwd });
}

export function spawnTransformAsync() {
  // import() crashes with jest
  return spawn("compile-async");
}

export function spawnTransformSync() {
  // import() crashes with jest
  return spawn("compile-sync");
}

// !!!! hack is coming !!!!
// Remove this function when https://github.com/nodejs/node/issues/35889 is resolved.
// Jest supports dynamic import(), but Node.js segfaults when using it in our tests.
async function spawn(runner, filename, cwd = process.cwd()) {
  const { stdout, stderr } = await util.promisify(cp.execFile)(
    process.execPath,
    // pass `cwd` as params as `process.cwd()` will normalize `cwd` on macOS
    [require.resolve(`../fixtures/babel-${runner}.mjs`), filename, cwd],
    { cwd, env: process.env },
  );

  const EXPERIMENTAL_WARNING =
    /\(node:\d+\) ExperimentalWarning: The ESM module loader is experimental\./;

  if (stderr.replace(EXPERIMENTAL_WARNING, "").trim()) {
    throw new Error(
      `error is thrown in babel-${runner}.mjs: stdout\n` +
        stdout +
        "\nstderr:\n" +
        stderr,
    );
  }
  return JSON.parse(stdout);
}
