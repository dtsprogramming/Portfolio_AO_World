/**
 * Passenger-compatible production launcher.
 * Hostinger may preserve the `dist` directory or promote its contents into the
 * application root, so resolve both layouts before loading Vinext's ESM server.
 */
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const candidates = [
  resolve(__dirname, "vinext-server.mjs"),
  resolve(__dirname, "dist", "standalone", "vinext-server.mjs"),
  resolve(__dirname, "standalone", "vinext-server.mjs"),
];
const server = candidates.find(existsSync);

if (!server) {
  console.error("[axon] Standalone server was not found.");
  console.error(`[axon] Checked: ${candidates.join(", ")}`);
  process.exit(1);
}

import(pathToFileURL(server).href).catch((error) => {
  console.error("[axon] Failed to start the standalone server.");
  console.error(error);
  process.exit(1);
});
