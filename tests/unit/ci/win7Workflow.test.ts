import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import jsYaml from "js-yaml";

const WORKFLOW_PATH = resolve(process.cwd(), ".github/workflows/build-windows-win7.yml");

function loadWorkflow() {
  return jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as any;
}

function getStepRuns(workflow: any): string[] {
  const job = Object.values(workflow.jobs)[0] as any;
  return (job.steps as any[]).map((s) => s.run ?? "").filter(Boolean);
}

function getStepByName(workflow: any, nameFragment: string) {
  const job = Object.values(workflow.jobs)[0] as any;
  return (job.steps as any[]).find((s) =>
    typeof s.name === "string" && s.name.toLowerCase().includes(nameFragment.toLowerCase())
  );
}

describe("build-windows-win7.yml — better-sqlite3 ABI guard", () => {
  it("uses @electron/rebuild for better-sqlite3, not prebuild-install", () => {
    const wf = loadWorkflow();
    const allRuns = getStepRuns(wf).join("\n");

    expect(allRuns).toContain("@electron/rebuild");
    expect(allRuns).toContain("better-sqlite3");

    // prebuild-install must NOT be used for better-sqlite3 (the root cause of the ABI crash)
    const hasPrebuildForSqlite = getStepRuns(wf).some(
      (run) =>
        run.includes("prebuild-install") &&
        (run.includes("better-sqlite3") || run.includes("better_sqlite3"))
    );
    expect(hasPrebuildForSqlite).toBe(false);
  });

  it("rebuild step targets the same ELECTRON_VERSION env var used throughout the workflow", () => {
    const wf = loadWorkflow();
    const job = Object.values(wf.jobs)[0] as any;
    const electronVersionEnv: string = job.env?.ELECTRON_VERSION ?? "";

    expect(electronVersionEnv).toBeTruthy();

    const rebuildStep = getStepByName(wf, "better-sqlite3");
    expect(rebuildStep).toBeDefined();
    expect(rebuildStep.run).toContain("ELECTRON_VERSION");
  });

  it("rebuild step explicitly verifies the binary exists after rebuild", () => {
    const wf = loadWorkflow();
    const rebuildStep = getStepByName(wf, "better-sqlite3");
    expect(rebuildStep).toBeDefined();

    // The step must check for better_sqlite3.node and fail loudly if missing
    expect(rebuildStep.run).toContain("better_sqlite3.node");
    expect(rebuildStep.run).toMatch(/exit 1|Write-Error/);
  });

  it("keytar is also rebuilt via @electron/rebuild (not prebuild-install)", () => {
    const wf = loadWorkflow();
    const keytarStep = getStepByName(wf, "keytar");
    expect(keytarStep).toBeDefined();
    expect(keytarStep.run).toContain("@electron/rebuild");
    expect(keytarStep.run).toContain("keytar");
  });

  it("workflow targets a pinned ELECTRON_VERSION (not a range)", () => {
    const wf = loadWorkflow();
    const job = Object.values(wf.jobs)[0] as any;
    const version: string = job.env?.ELECTRON_VERSION ?? "";

    // Must be a concrete semver like 22.3.27, not a range like ^22 or latest
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
