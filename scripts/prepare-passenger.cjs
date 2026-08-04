/** Copies the Hostinger Passenger launcher into the promoted build output. */
const { copyFileSync, cpSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const output = resolve(root, "dist");

mkdirSync(output, { recursive: true });
copyFileSync(resolve(root, "server.cjs"), resolve(output, "server.cjs"));
cpSync(resolve(root, "public"), resolve(output, "standalone"), {
  recursive: true,
  force: true,
});
console.log("[axon] Prepared Passenger launcher and root public assets.");
