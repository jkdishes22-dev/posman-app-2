#!/usr/bin/env node

/**
 * Fix broken tree-sitter dependencies in @swagger-api packages
 * This is needed because electron-builder fails when analyzing these broken dependencies
 */

const fs = require("fs");
const path = require("path");

const problematicPackages = [
  "node_modules/@swagger-api/apidom-parser-adapter-json/package.json",
  "node_modules/@swagger-api/apidom-parser-adapter-yaml-1-2/package.json",
];

const lockfileEntriesToSanitize = [
  "node_modules/@swagger-api/apidom-parser-adapter-json",
  "node_modules/@swagger-api/apidom-parser-adapter-yaml-1-2",
];

function removeTreeSitterDeps(deps = {}) {
  let modified = false;
  for (const dep of Object.keys(deps)) {
    if (dep.includes("tree-sitter")) {
      delete deps[dep];
      modified = true;
    }
  }
  return modified;
}

console.log("🔧 Fixing broken dependencies in @swagger-api packages...");

for (const pkgPath of problematicPackages) {
  const fullPath = path.join(process.cwd(), pkgPath);
  
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  try {
    const content = fs.readFileSync(fullPath, "utf8");
    const pkg = JSON.parse(content);
    
    let modified = false;

    // Remove broken tree-sitter dependencies
    if (pkg.dependencies) {
      const before = { ...pkg.dependencies };
      modified = removeTreeSitterDeps(pkg.dependencies) || modified;
      for (const dep of Object.keys(before)) {
        if (!(dep in pkg.dependencies)) {
          console.log(`  ✓ Removed ${dep} from ${path.basename(path.dirname(fullPath))}`);
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    }
  } catch (error) {
    console.warn(`  ⚠ Could not fix ${pkgPath}: ${error.message}`);
  }
}

// Keep lockfile dependency graph aligned with the patched node_modules manifests.
// electron-builder's collector can read both project and hidden npm lockfiles.
const lockfilePaths = [
  path.join(process.cwd(), "package-lock.json"),
  path.join(process.cwd(), "node_modules", ".package-lock.json"),
];

for (const lockfilePath of lockfilePaths) {
  if (!fs.existsSync(lockfilePath)) {
    continue;
  }

  try {
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
    const packages = lockfile && lockfile.packages ? lockfile.packages : null;

    if (packages) {
      for (const entry of lockfileEntriesToSanitize) {
        const pkg = packages[entry];
        if (!pkg || !pkg.dependencies) continue;

        const before = { ...pkg.dependencies };
        const changed = removeTreeSitterDeps(pkg.dependencies);
        if (changed) {
          for (const dep of Object.keys(before)) {
            if (!(dep in pkg.dependencies)) {
              console.log(`  ✓ Removed ${dep} from ${path.basename(lockfilePath)} entry ${entry}`);
            }
          }
        }
      }

      fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + "\n", "utf8");
    }
  } catch (error) {
    console.warn(`  ⚠ Could not sanitize ${path.basename(lockfilePath)}: ${error.message}`);
  }
}

// Also remove only nested problematic packages that are not direct app dependencies.
// Keep direct dependencies (e.g. swagger-ui-react) on disk so electron-builder's
// dependency graph resolution does not encounter missing-path entries.
console.log("\n🛡️  Keeping declared packages installed for electron-builder dependency graph.");
console.log("✅ Done fixing dependencies\n");
