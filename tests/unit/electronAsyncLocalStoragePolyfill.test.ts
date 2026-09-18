import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AsyncLocalStorage } from "async_hooks";
import { createRequire } from "module";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { getAsyncLocalStoragePolyfillSource } from "../../electron/async-local-storage-polyfill.cjs";

const nodeRequire = createRequire(import.meta.url);

// Regression test for the Windows 7 launch crash: Electron 22.3.27 (the pinned runtime for
// .github/workflows/build-windows-win7.yml) ships Node 16, which predates
// AsyncLocalStorage.snapshot(). Next.js 15 calls it unconditionally on server startup, so the
// standalone server crashed before it could bind to a port with
// "AsyncLocalStorage.snapshot is not a function" — the app installed and activated, but the
// window never loaded.
describe("electron async-local-storage-polyfill (Windows 7 / Node 16 launch fix)", () => {
  let originalStaticSnapshot: unknown;
  let originalProtoSnapshot: unknown;

  beforeEach(() => {
    originalStaticSnapshot = (AsyncLocalStorage as any).snapshot;
    originalProtoSnapshot = (AsyncLocalStorage.prototype as any).snapshot;
    // Simulate Node 16, which has neither the static nor the instance snapshot() method.
    delete (AsyncLocalStorage as any).snapshot;
    delete (AsyncLocalStorage.prototype as any).snapshot;
  });

  afterEach(() => {
    (AsyncLocalStorage as any).snapshot = originalStaticSnapshot;
    (AsyncLocalStorage.prototype as any).snapshot = originalProtoSnapshot;
  });

  it("reproduces the exact reported crash before the polyfill runs", () => {
    expect(typeof (AsyncLocalStorage as any).snapshot).toBe("undefined");
    expect(() => (AsyncLocalStorage as any).snapshot()).toThrow(/snapshot is not a function/);
  });

  it("adds a working static snapshot() that preserves the captured context", () => {
    new Function("require", getAsyncLocalStoragePolyfillSource())(nodeRequire);
    expect(typeof (AsyncLocalStorage as any).snapshot).toBe("function");

    const als = new AsyncLocalStorage<string>();
    let capturedRunner: ((cb: () => void) => void) | undefined;
    als.run("outer-value", () => {
      capturedRunner = (AsyncLocalStorage as any).snapshot();
    });

    let seen: string | undefined;
    als.run("different-value", () => {
      capturedRunner!(() => {
        seen = als.getStore();
      });
    });

    expect(seen).toBe("outer-value");
  });

  it("adds a working instance snapshot()", () => {
    new Function("require", getAsyncLocalStoragePolyfillSource())(nodeRequire);

    const als = new AsyncLocalStorage<string>();
    let capturedRunner: ((cb: () => void) => void) | undefined;
    als.run("instance-value", () => {
      capturedRunner = (als as any).snapshot();
    });

    let seen: string | undefined;
    als.run("something-else", () => {
      capturedRunner!(() => {
        seen = als.getStore();
      });
    });

    expect(seen).toBe("instance-value");
  });

  it("is a no-op when snapshot() is already natively available", () => {
    (AsyncLocalStorage as any).snapshot = originalStaticSnapshot;
    (AsyncLocalStorage.prototype as any).snapshot = originalProtoSnapshot;
    const before = (AsyncLocalStorage as any).snapshot;

    new Function("require", getAsyncLocalStoragePolyfillSource())(nodeRequire);

    expect((AsyncLocalStorage as any).snapshot).toBe(before);
  });
});
