import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);
const rootClient = await readFile(
  fileURLToPath(new URL("../dist/index.js", import.meta.url)),
  "utf8",
);

test("the existing root data client remains UI-free", () => {
  assert.deepEqual(Object.keys(packageJson.exports), [".", "./react"]);
  assert.equal(packageJson.exports["."].import, "./dist/index.js");
  assert.equal(packageJson.exports["./react"].import, "./dist/react.js");
  assert.doesNotMatch(rootClient, /next\/image|react\/jsx-runtime|NotFairPostHero/);
});
