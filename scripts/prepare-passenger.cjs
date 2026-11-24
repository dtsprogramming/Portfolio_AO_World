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
const vinextServer = resolve(standalone, "vinext-server.mjs");
const generatedClient = resolve(output, "client");
const standaloneClient = resolve(standalone, "client");
const outputServer = resolve(output, "server.js");
const outputPackage = resolve(output, "package.json");

mkdirSync(output, { recursive: true });
copyFileSync(resolve(root, "server.cjs"), resolve(output, "server.cjs"));

// Preserve Vinext's generated ESM server behind a stable Passenger-compatible
// CommonJS entrypoint. Hostinger requires server.js inside the output folder.
if (existsSync(standaloneServer)) {
  copyFileSync(standaloneServer, vinextServer);
} else {
  mkdirSync(standalone, { recursive: true });
  writeFileSync(
    vinextServer,
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

writeFileSync(
  standaloneServer,
  `#!/usr/bin/env node
import "./vinext-server.mjs";
`,
);

// Hostinger recognizes dist/client and dist/server as the Vinext output, so
// make dist itself a complete Node application rather than relying on the host
// to promote the nested standalone directory.
writeFileSync(
  outputServer,
  `#!/usr/bin/env node
import "./standalone/vinext-server.mjs";
`,
);
writeFileSync(
  outputPackage,
  `${JSON.stringify(
    {
      name: "axon-override-hostinger",
      version: "1.0.0",
      private: true,
      type: "module",
      engines: { node: ">=22.13.0" },
      scripts: { start: "node server.js" },
    },
    null,
    2,
  )}\n`,
);

cpSync(resolve(root, "public"), standalone, {
  recursive: true,
  force: true,
});

if (!existsSync(generatedClient)) {
  throw new Error("Vinext client output missing: dist/client");
}
rmSync(standaloneClient, { recursive: true, force: true });
cpSync(generatedClient, standaloneClient, {
  recursive: true,
  force: true,
});

const standalonePackagePath = resolve(standalone, "package.json");
const standalonePackage = JSON.parse(readFileSync(standalonePackagePath, "utf8"));
standalonePackage.type = "module";
standalonePackage.name = "axon-override-standalone";
standalonePackage.version = "1.0.0";
standalonePackage.engines = { node: ">=22.13.0" };
standalonePackage.scripts = { start: "node server.js" };
writeFileSync(
  standalonePackagePath,
  `${JSON.stringify(standalonePackage, null, 2)}\n`,
);

if (
  !existsSync(outputServer) ||
  !existsSync(generatedClient) ||
  !existsSync(standaloneServer) ||
  !existsSync(vinextServer)
) {
  throw new Error(
    "Hostinger output missing: dist/server.js, dist/client, or standalone runtime",
  );
}

// Hostinger may classify this Vinext project as standard Next.js because the
// compatibility package is installed. Keep the conventional output available
// in addition to the actual configured output: dist/standalone.
rmSync(nextStandalone, { recursive: true, force: true });
mkdirSync(resolve(root, ".next"), { recursive: true });
cpSync(standalone, nextStandalone, { recursive: true, force: true });

console.log(
  "[axon] Prepared runnable dist output with server.js and client assets.",
);
