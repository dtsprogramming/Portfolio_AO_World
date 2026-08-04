/** Copies the Hostinger Passenger launcher into the promoted build output. */
const { copyFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const output = resolve(root, "dist");

mkdirSync(output, { recursive: true });
copyFileSync(resolve(root, "server.cjs"), resolve(output, "server.cjs"));
console.log("[axon] Prepared dist/server.cjs for Passenger.");
