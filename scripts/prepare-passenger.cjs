/**
 * Makes Vinext's standalone server self-describing for Hostinger and mirrors
 * it to Next.js' conventional path for hosts that detect the `next` package.
 */
const {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const output = resolve(root, "dist");
const standalone = resolve(output, "standalone");
const nextStandalone = resolve(root, ".next", "standalone");
const standaloneServer = resolve(standalone, "server.js");

mkdirSync(output, { recursive: true });
copyFileSync(resolve(root, "server.cjs"), resolve(output, "server.cjs"));

// Vinext normally creates this entrypoint. Generate the equivalent launcher as
// a deployment safeguard if a hosting build omits it from the standalone copy.
if (!existsSync(standaloneServer)) {
  mkdirSync(standalone, { recursive: true });
  writeFileSync(
    standaloneServer,
    `#!/usr/bin/env node
import { join } from "node:path";
import { startProdServer } from "vinext/server/prod-server";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

startProdServer({
  port,
  host,
  outDir: join(import.meta.dirname, "dist"),
}).catch((error) => {
  console.error("[vinext] Failed to start standalone server");
  console.error(error);
  process.exit(1);
});
`,
  );
}

cpSync(resolve(root, "public"), standalone, {
  recursive: true,
  force: true,
});

const standalonePackagePath = resolve(standalone, "package.json");
const standalonePackage = JSON.parse(readFileSync(standalonePackagePath, "utf8"));
standalonePackage.name = "axon-override-standalone";
standalonePackage.version = "1.0.0";
standalonePackage.engines = { node: ">=22.13.0" };
standalonePackage.scripts = { start: "node server.js" };
writeFileSync(
  standalonePackagePath,
  `${JSON.stringify(standalonePackage, null, 2)}\n`,
);

if (!existsSync(standaloneServer)) {
  throw new Error("Hostinger entrypoint missing: dist/standalone/server.js");
}

// Hostinger may classify this Vinext project as standard Next.js because the
// compatibility package is installed. Keep the conventional output available
// in addition to the actual configured output: dist/standalone.
rmSync(nextStandalone, { recursive: true, force: true });
mkdirSync(resolve(root, ".next"), { recursive: true });
cpSync(standalone, nextStandalone, { recursive: true, force: true });

console.log(
  "[axon] Prepared dist/standalone and .next/standalone for Hostinger.",
);
