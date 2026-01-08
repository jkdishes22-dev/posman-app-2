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

// Also remove the problematic packages entirely since they're excluded from the build anyway
const packagesToRemove = [
  "node_modules/@swagger-api",
  "node_modules/swagger-client",
  "node_modules/swagger-ui-react",
];

console.log("\n🗑️  Removing excluded packages from node_modules...");
for (const pkgPath of packagesToRemove) {
  const fullPath = path.join(process.cwd(), pkgPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✓ Removed ${path.basename(pkgPath)}`);
    } catch (error) {
      console.warn(`  ⚠ Could not remove ${pkgPath}: ${error.message}`);
    }
  }
}

console.log("✅ Done fixing dependencies\n");
