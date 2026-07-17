/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

/**
 * Source for the Node 16 `AsyncLocalStorage.snapshot()` polyfill, embedded verbatim into the
 * generated ESM loader (see server-esm-loader construction in electron/main.cjs).
 *
 * Electron 22.3.27 — the pinned runtime for the Windows 7 legacy build
 * (.github/workflows/build-windows-win7.yml) — ships Node 16, which predates both the static
 * `AsyncLocalStorage.snapshot()`/`.bind()` methods and the instance `snapshot()` method (all
 * added in later Node releases). Next.js 15's request-context plumbing calls these
 * unconditionally, so on Node 16 the standalone server crashes on startup with
 * "AsyncLocalStorage.snapshot is not a function" before it can bind to a port — the app
 * installs and activates, but the window never loads.
 *
 * This mirrors Node's own real implementation (AsyncResource.bind) so the calls succeed on
 * Node 16 exactly as they would on a newer runtime. On Node versions that already have these
 * methods, every branch below is a no-op.
 */
function getAsyncLocalStoragePolyfillSource() {
    return [
        "(function(){",
        "  var ah=require('async_hooks');",
        "  var ALS=ah.AsyncLocalStorage;",
        // NOTE: `typeof ALS.bind === 'function'` is ALWAYS true even when Node has no static
        // override — every function/class inherits Function.prototype.bind. Checking that
        // (or assigning through it) silently produces a *bound class constructor* instead of a
        // context-preserving wrapper, which throws "Class constructor ... cannot be invoked
        // without 'new'" the first time it's called. So `snapshot` is built directly on
        // `AsyncResource.bind` (a genuine own static method, safe to rely on) instead of going
        // through `ALS.bind`.
        "  if(!Object.prototype.hasOwnProperty.call(ALS,'snapshot')){",
        "    ALS.snapshot=function(){",
        "      return ah.AsyncResource.bind(function(cb){",
        "        var args=Array.prototype.slice.call(arguments,1);",
        "        return cb.apply(null,args);",
        "      });",
        "    };",
        "  }",
        "  if(typeof ALS.prototype.snapshot!=='function'){",
        "    ALS.prototype.snapshot=function(){",
        "      var store=this.getStore();",
        "      var als=this;",
        "      return ah.AsyncResource.bind(function(cb){",
        "        var args=Array.prototype.slice.call(arguments,1);",
        "        return als.run(store, function(){ return cb.apply(null,args); });",
        "      });",
        "    };",
        "  }",
        "  process.stdout.write('[ESM-LOADER] AsyncLocalStorage.snapshot polyfill checked\\n');",
        "})();",
    ].join("\n");
}

module.exports = { getAsyncLocalStoragePolyfillSource };
