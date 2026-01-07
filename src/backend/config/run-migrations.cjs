/* eslint-disable @typescript-eslint/no-require-imports */
// CommonJS wrapper for run-migrations.ts
// This file executes the TypeScript file using ts-node with CommonJS loader
// (same approach as other migration commands)

const { resolve } = require("path");
const { spawn } = require("child_process");
const { existsSync } = require("fs");

// Find ts-node binaries
const tsNodeScript = resolve(process.cwd(), "node_modules/.bin/ts-node-script");
const tsNodeBin = resolve(process.cwd(), "node_modules/.bin/ts-node");
const tsNodeModule = resolve(process.cwd(), "node_modules/ts-node/dist/bin-script.js");

// Determine which ts-node to use
// ts-node-script is designed for scripts in projects with "type": "module"
let tsNodePath;
let args;
const scriptPath = resolve(__dirname, "run-migrations.ts");

if (existsSync(tsNodeScript)) {
    // Best option: ts-node-script handles ES modules properly
    tsNodePath = tsNodeScript;
    args = [scriptPath];
} else if (existsSync(tsNodeBin)) {
    tsNodePath = tsNodeBin;
    args = ["--script-mode", scriptPath];
} else if (existsSync(tsNodeModule)) {
    tsNodePath = "node";
    args = [tsNodeModule, scriptPath];
} else {
    // Last resort: try npx
    tsNodePath = "npx";
    args = ["ts-node-script", scriptPath];
}

// Set up environment for ts-node to work with ES modules
const env = {
    ...process.env,
    NODE_OPTIONS: "--loader ts-node/esm",
};

// Execute the TypeScript file
const child = spawn(tsNodePath, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: env,
    shell: process.platform === "win32",
});

child.on("exit", (code) => {
    process.exit(code || 0);
});

child.on("error", (error) => {
    console.error("❌ Failed to execute migration script:", error);
    console.error("💡 Make sure ts-node is installed: npm install --save-dev ts-node");
    process.exit(1);
});
