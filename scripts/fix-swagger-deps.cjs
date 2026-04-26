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
      const depsToRemove = Object.keys(pkg.dependencies).filter(dep => 
        dep.includes("tree-sitter")
      );
      
      for (const dep of depsToRemove) {
        delete pkg.dependencies[dep];
        modified = true;
        console.log(`  ✓ Removed ${dep} from ${path.basename(path.dirname(fullPath))}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    }
  } catch (error) {
    console.warn(`  ⚠ Could not fix ${pkgPath}: ${error.message}`);
  }
}

// Also remove only nested problematic packages that are not direct app dependencies.
// Keep direct dependencies (e.g. swagger-ui-react) on disk so electron-builder's
// dependency graph resolution does not encounter missing-path entries.
console.log("\n🛡️  Keeping declared packages installed for electron-builder dependency graph.");
console.log("✅ Done fixing dependencies\n");
