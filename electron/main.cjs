/* eslint-disable @typescript-eslint/no-require-imports */
// Electron main process uses CommonJS (require) not ES modules
const { app, BrowserWindow, shell, utilityProcess, dialog, ipcMain } = require("electron");
// electron-updater is optional — excluded from ASAR to avoid packing duplicate node_modules.
// The Next.js standalone bundle already contains its own node_modules.
let autoUpdater = null;
try { autoUpdater = require("electron-updater").autoUpdater; } catch (_) { /* no-op */ }
const path = require("path");
const fs = require("fs");
const os = require("os");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const isProduction = !isDev;
/** Set JK_POSMAN_DEBUG_STARTUP=1 for verbose path probes, resources listing, and per-tick readiness logs. */
const verboseStartup =
    process.env.JK_POSMAN_DEBUG_STARTUP === "1" ||
    process.env.JK_POSMAN_DEBUG_STARTUP === "true";

let mainWindow = null;
let nextServer = null;
// Use custom port 8817 to avoid conflicts with other services (like Metabase on 3000, Next.js dev on 3000, etc.)
const PORT = process.env.PORT || 2026;
const HOST = "localhost";

// Setup logging to file for Windows debugging
const logDir = path.join(os.homedir(), "AppData", "Local", "JK PosMan", "logs");
const logFile = path.join(logDir, `app-${new Date().toISOString().replace(/:/g, "-")}.log`);

function ensureLogDir() {
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (error) {
        // If we can't create log dir, continue without file logging
    }
}

function logToFile(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    // Always log to console
    if (level === "ERROR") {
        console.error(logMessage.trim());
    } else {
        console.log(logMessage.trim());
    }

    // Try to log to file
    try {
        ensureLogDir();
        fs.appendFileSync(logFile, logMessage);
    } catch (error) {
        // If file logging fails, continue without it
    }
}

// Log startup
logToFile("=== JK PosMan Application Starting ===");
logToFile(`Platform: ${process.platform}`);
logToFile(`Architecture: ${process.arch}`);
logToFile(`Node version: ${process.versions.node}`);
logToFile(`Electron version: ${process.versions.electron}`);
logToFile(`Is packaged: ${app.isPackaged}`);
logToFile(`App path: ${app.getAppPath()}`);
logToFile(`User data: ${app.getPath("userData")}`);

/**
 * Start Next.js server
 */
function startNextServer() {
    if (isDev) {
        logToFile(`Development mode: waiting for Next.js dev server on port ${PORT}...`);
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 120; // 60 s
            const checkServer = setInterval(() => {
                attempts++;
                const http = require("http");
                const req = http.get(`http://${HOST}:${PORT}`, (res) => {
                    clearInterval(checkServer);
                    logToFile(`Dev server ready (HTTP ${res.statusCode})`);
                    resolve();
                });
                req.on("error", () => {
                    if (attempts >= maxAttempts) {
                        clearInterval(checkServer);
                        reject(new Error(`Next.js dev server not responding after 60 s.\nRun in a separate terminal: npm run dev`));
                    }
                });
                req.setTimeout(1000, () => req.destroy());
            }, 500);
        });
    }

    return new Promise((resolve, reject) => {
        // In production, start the Next.js server
        // When packaged, files may be in app.asar or app.asar.unpacked (if asarUnpack is configured)
        let nextPath, serverPath;
        const appPath = app.getAppPath();
        const electronDir = path.dirname(process.execPath);
        // process.resourcesPath = Contents/Resources/ on macOS, <installDir>/resources/ on Windows
        // This is where extraResources and asarUnpack place files.
        // electronDir alone is Contents/MacOS/ on macOS, which is NOT where resources are.
        const resourcesDir = process.resourcesPath || path.join(electronDir, "resources");

        if (app.isPackaged) {
            // CRITICAL: utilityProcess.fork() CANNOT execute files from inside ASAR archives.
            // .next/standalone must be outside ASAR (via extraResources, extraFiles, or asarUnpack).

            // extraResources → Contents/Resources/.next/standalone (macOS) or resources/.next/standalone (Win)
            const extraResourcesPath = path.join(resourcesDir, ".next", "standalone");
            const extraResourcesServerPath = path.join(extraResourcesPath, "server.js");

            // asarUnpack → Contents/Resources/app.asar.unpacked/.next/standalone
            const unpackedPath = path.join(resourcesDir, "app.asar.unpacked", ".next", "standalone");
            const unpackedServerPath = path.join(unpackedPath, "server.js");

            // extraFiles → same dir as executable (.next/standalone beside JK PosMan.exe on Win,
            // or Contents/.next/standalone on macOS — use parent of execPath for macOS)
            const execDir = process.platform === "darwin"
                ? path.join(electronDir, "..", "..")  // Contents/MacOS/../../ = Contents/
                : electronDir;
            const extraFilesPath = path.join(execDir, ".next", "standalone");
            const extraFilesServerPath = path.join(extraFilesPath, "server.js");

            // Legacy aliases (kept for log parity)
            const altUnpackedPath = extraResourcesPath;
            const altUnpackedServerPath = extraResourcesServerPath;

            if (verboseStartup) {
                logToFile(`Checking unpacked path: ${unpackedPath}`);
                logToFile(`Unpacked server.js exists: ${fs.existsSync(unpackedServerPath)}`);
                logToFile(`Checking alt unpacked path: ${altUnpackedPath}`);
                logToFile(`Alt unpacked server.js exists: ${fs.existsSync(altUnpackedServerPath)}`);
                logToFile(`Checking extraResources path: ${extraResourcesPath}`);
                logToFile(`ExtraResources server.js exists: ${fs.existsSync(extraResourcesServerPath)}`);
                logToFile(`Checking extraFiles path: ${extraFilesPath}`);
                logToFile(`ExtraFiles server.js exists: ${fs.existsSync(extraFilesServerPath)}`);
            }

            // Full resources listing is expensive; enable with JK_POSMAN_DEBUG_STARTUP=1
            if (verboseStartup && fs.existsSync(resourcesDir)) {
                try {
                    logToFile(`Listing ALL contents of resources directory: ${resourcesDir}`);
                    const resourcesContents = fs.readdirSync(resourcesDir, { withFileTypes: true });
                    logToFile(`Resources directory contents (${resourcesContents.length} items):`);
                    resourcesContents.forEach((item) => {
                        const itemPath = path.join(resourcesDir, item.name);
                        if (item.isDirectory()) {
                            logToFile(`  [DIR]  ${item.name}/`);
                            try {
                                const subContents = fs.readdirSync(itemPath, { withFileTypes: true });
                                logToFile(`         Contains: ${subContents.map(d => d.name).join(", ")}`);
                            } catch (err) {
                                logToFile(`         (Could not read: ${err.message})`);
                            }
                        } else {
                            const stats = fs.statSync(itemPath);
                            logToFile(`  [FILE] ${item.name} (${(stats.size / 1024).toFixed(2)} KB)`);
                        }
                    });
                } catch (err) {
                    logToFile(`Could not list resources directory: ${err.message}`, "ERROR");
                }
            } else if (!fs.existsSync(resourcesDir)) {
                logToFile(`Resources directory does not exist: ${resourcesDir}`, "ERROR");
            }

            // Priority order: extraFiles > extraResources > unpacked ASAR > alternative paths
            // extraFiles copies to app directory (same level as executable), most accessible
            if (fs.existsSync(extraFilesServerPath)) {
                nextPath = extraFilesPath;
                serverPath = extraFilesServerPath;
                logToFile("Using extraFiles path (copied to app/.next/standalone)");
            } else if (fs.existsSync(extraResourcesServerPath)) {
                nextPath = extraResourcesPath;
                serverPath = extraResourcesServerPath;
                logToFile("Using extraResources path (copied to resources/.next/standalone)");
            } else if (fs.existsSync(unpackedServerPath)) {
                nextPath = unpackedPath;
                serverPath = unpackedServerPath;
                logToFile("Using unpacked ASAR path (app.asar.unpacked)");
            } else if (fs.existsSync(altUnpackedServerPath)) {
                nextPath = altUnpackedPath;
                serverPath = altUnpackedServerPath;
                logToFile("Using alternative unpacked path");
            } else {
                // CRITICAL ERROR: utilityProcess cannot execute files from ASAR
                // The build must have extraFiles, extraResources, or asarUnpack configured correctly
                const error = `Unpacked Next.js server not found. utilityProcess cannot execute files from ASAR archives.\n\nChecked paths:\n- ${extraFilesPath} (extraFiles)\n- ${extraResourcesPath} (extraResources)\n- ${unpackedPath} (asarUnpack)\n- ${altUnpackedPath} (alternative)\n\nPlease ensure electron-builder.config.js has extraFiles, extraResources, or asarUnpack configured for .next/standalone`;
                logToFile(error, "ERROR");
                logToFile(`App path: ${appPath}`, "ERROR");
                logToFile(`__dirname: ${__dirname}`, "ERROR");
                logToFile(`Electron dir: ${electronDir}`, "ERROR");
                reject(new Error(error));
                return;
            }

            if (verboseStartup) {
                logToFile(`App path: ${appPath}`);
                logToFile(`__dirname: ${__dirname}`);
                logToFile(`Electron dir: ${electronDir}`);
            } else {
                logToFile(`Next standalone: ${serverPath}`);
            }
        } else {
            // In development, use normal paths
            nextPath = path.join(__dirname, "../.next/standalone");
            serverPath = path.join(nextPath, "server.js");
        }

        if (verboseStartup) {
            logToFile(`Looking for Next.js server at: ${serverPath}`);
            logToFile(`Next.js path exists: ${fs.existsSync(nextPath)}`);
            logToFile(`Server.js exists: ${fs.existsSync(serverPath)}`);
        }

        // Check if standalone build exists
        if (!fs.existsSync(serverPath)) {
            const error = "Standalone build not found. Please run: npm run build";
            logToFile(error, "ERROR");
            logToFile(`Checked path: ${serverPath}`, "ERROR");
            logToFile(`__dirname: ${__dirname}`, "ERROR");
            logToFile(`App path: ${appPath}`, "ERROR");
            reject(new Error(error));
            return;
        }

        // Set environment variables for the Next.js server
        const env = {
            ...process.env,
            PORT: PORT.toString(),
            HOST: HOST,
            NODE_ENV: "production",
            DB_MODE: process.env.DB_MODE || "sqlite",
            // For SQLite: store DB file in user data directory so it persists across app updates
            SQLITE_DB_PATH: path.join(app.getPath("userData"), "posman.db"),
        };

        // Set NODE_PATH to ensure modules are found
        env.NODE_PATH = path.join(nextPath, "node_modules");

        if (verboseStartup) {
            logToFile(`Server script path: ${serverPath}`);
            logToFile(`Working directory: ${nextPath}`);
            logToFile(`Using utilityProcess API (Electron's recommended approach)`);
            logToFile(`Attempting to fork server at: ${serverPath}`);
            logToFile(`Server path exists: ${fs.existsSync(serverPath)}`);
            logToFile(`Server path is absolute: ${path.isAbsolute(serverPath)}`);
        }

        // Verify the path is NOT inside ASAR
        if (serverPath.includes("app.asar") && !serverPath.includes("app.asar.unpacked")) {
            const error = `CRITICAL: Server path is inside ASAR archive! utilityProcess cannot execute files from ASAR.\nPath: ${serverPath}\n\nPlease ensure asarUnpack is configured correctly in electron-builder.config.js`;
            logToFile(error, "ERROR");
            reject(new Error(error));
            return;
        }

        try {
            nextServer = utilityProcess.fork(serverPath, [], {
                cwd: nextPath,
                env: env,
                stdio: "pipe",
            });

            logToFile("utilityProcess.fork() called successfully");
            logToFile(`Process PID: ${nextServer.pid || "unknown"}`);

            // Pipe server stdout/stderr to the Electron log so errors (e.g. native module
            // ABI mismatches, missing migrations) are visible without a separate console.
            if (nextServer.stdout) {
                nextServer.stdout.on("data", (data) => {
                    const lines = data.toString().trim().split("\n");
                    lines.forEach((line) => { if (line) logToFile(`[server] ${line}`); });
                });
            }
            if (nextServer.stderr) {
                nextServer.stderr.on("data", (data) => {
                    const lines = data.toString().trim().split("\n");
                    lines.forEach((line) => { if (line) logToFile(`[server-err] ${line}`, "ERROR"); });
                });
            }
        } catch (error) {
            logToFile(`Failed to create utilityProcess: ${error.message}`, "ERROR");
            logToFile(`Error code: ${error.code}`, "ERROR");
            logToFile(`Error stack: ${error.stack}`, "ERROR");
            reject(error);
            return;
        }

        // utilityProcess uses message ports for IPC instead of stdio
        // Listen for messages from the child process
        nextServer.on("message", (message) => {
            if (verboseStartup) {
                logToFile(`Next.js server message: ${JSON.stringify(message)}`);
            }
        });

        // Handle utilityProcess lifecycle events
        nextServer.on("spawn", () => {
            logToFile("Next.js server process spawned successfully");
        });

        nextServer.on("error", (error) => {
            logToFile(`utilityProcess error: ${error.message}`, "ERROR");
            logToFile(`Error code: ${error.code}`, "ERROR");
            logToFile(`Error stack: ${error.stack}`, "ERROR");
            reject(error);
        });

        nextServer.on("exit", (code, signal) => {
            if (code !== 0 && code !== null) {
                logToFile(`Next.js server exited with code ${code} and signal ${signal}`, "ERROR");
                // If server exits before we resolve, reject the promise
                if (code !== null) {
                    const error = `Next.js server exited unexpectedly with code ${code}`;
                    logToFile(error, "ERROR");
                    reject(new Error(error));
                }
            } else {
                logToFile(`Next.js server exited normally`);
            }
        });

        // Log process details for debugging
        setTimeout(() => {
            if (nextServer && nextServer.pid) {
                logToFile(`Process still running, PID: ${nextServer.pid}`);
            } else {
                logToFile(`WARNING: Process PID not available`, "ERROR");
            }
        }, 1000);

        // Wait for server to be ready
        let attempts = 0;
        const maxAttempts = 240; // 120 seconds (240 * 500ms) — first cold start with SQLite init takes > 30s
        const checkServer = setInterval(() => {
            attempts++;
            const http = require("http");
            if (verboseStartup || attempts === 1 || attempts % 20 === 0) {
                logToFile(`Checking server readiness (attempt ${attempts}/${maxAttempts}) at http://${HOST}:${PORT}...`);
            }
            const req = http.get(`http://${HOST}:${PORT}`, (res) => {
                if (verboseStartup) {
                    logToFile(`Server responded with status ${res.statusCode}`);
                }
                const contentType = res.headers["content-type"] || "";
                const serverHeader = res.headers["server"] || "";
                const xPoweredBy = res.headers["x-powered-by"] || "";
                if (verboseStartup) {
                    logToFile(`Response Content-Type: ${contentType}`);
                    logToFile(`Response Server header: ${serverHeader}`);
                    logToFile(`Response X-Powered-By: ${xPoweredBy}`);
                }

                // Next.js typically sets x-powered-by: Next.js
                if (xPoweredBy.includes("Next.js") || contentType.includes("text/html")) {
                    if (res.statusCode === 200) {
                        clearInterval(checkServer);
                        logToFile("Next.js server started successfully!");
                        resolve();
                    } else if (verboseStartup) {
                        logToFile(`Server responded with status ${res.statusCode} (expected 200)`);
                    }
                } else {
                    logToFile(`WARNING: Server response doesn't look like Next.js!`, "ERROR");
                    logToFile(`This might be another service (like Metabase) running on port ${PORT}`, "ERROR");
                }
            });
            req.on("error", (error) => {
                if (verboseStartup || attempts % 20 === 0) {
                    logToFile(`Server not ready yet: ${error.message}`);
                }
            });
            req.setTimeout(2000, () => {
                req.destroy();
            });
        }, 500);

        // Timeout after 120 seconds — covers slow first-boot SQLite migration on cold hardware
        setTimeout(() => {
            clearInterval(checkServer);
            const error = "Server startup timeout after 120 seconds";
            logToFile(error, "ERROR");
            reject(new Error(error));
        }, 120000);
    });
}

/**
 * Trigger startup bootstrap check once server is up.
 * This warms backend setup state before the login screen.
 */
function checkStartupBootstrapStatus() {
    return new Promise((resolve) => {
        const http = require("http");
        const req = http.get(`http://${HOST}:${PORT}/api/system/setup-status`, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(body || "{}");
                    logToFile(`Startup bootstrap status: ${parsed.state || "unknown"} (${parsed.code || "n/a"})`);
                } catch (error) {
                    logToFile(`Startup bootstrap status parse failed: ${error.message}`);
                }
                resolve();
            });
        });

        req.on("error", (error) => {
            logToFile(`Startup bootstrap status check failed: ${error.message}`, "ERROR");
            resolve();
        });

        req.setTimeout(8000, () => {
            req.destroy();
            logToFile("Startup bootstrap status check timed out", "ERROR");
            resolve();
        });
    });
}

function checkLicenseStatus() {
    return new Promise((resolve) => {
        const http = require("http");
        const req = http.get(`http://${HOST}:${PORT}/api/system/license-status?refresh=1`, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(body || "{}");
                    logToFile(`License status: ${parsed.state || "unknown"} (${parsed.code || "n/a"})`);
                } catch (error) {
                    logToFile(`License status parse failed: ${error.message}`);
                }
                resolve();
            });
        });

        req.on("error", (error) => {
            logToFile(`License status check failed: ${error.message}`, "ERROR");
            resolve();
        });

        req.setTimeout(8000, () => {
            req.destroy();
            logToFile("License status check timed out", "ERROR");
            resolve();
        });
    });
}

/**
 * Create the main application window
 */
function createWindow() {
    // Try to find icon file (Windows uses .ico, macOS/Linux use .png).
    // In a packaged app main.cjs lives inside app.asar, so __dirname is a virtual asar
    // path — fs calls resolve inside the archive, not the real filesystem. The icons are
    // copied as extraFiles to {appDir}/public/icons (outside the asar), so we must use
    // process.resourcesPath (= {appDir}/resources) to reach the app root.
    const fs = require("fs");
    let iconPath = null;
    const iconDir = app.isPackaged
        ? path.join(process.resourcesPath, "..", "public", "icons")
        : path.join(__dirname, "../public/icons");

    if (process.platform === "win32") {
        // Windows: prefer .ico for best taskbar quality, fallback to .png
        const icoPath = path.join(iconDir, "JK-icon.ico");
        const pngPath = path.join(iconDir, "JK-icon.png");
        iconPath = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : null);
    } else {
        // macOS/Linux: use .png
        const pngPath = path.join(iconDir, "JK-icon.png");
        iconPath = fs.existsSync(pngPath) ? pngPath : null;
    }

    const windowOptions = {
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.cjs"),
            webSecurity: true,
        },
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        show: false, // Don't show until ready
    };

    // Only set icon if file exists
    if (iconPath) {
        windowOptions.icon = iconPath;
    }

    mainWindow = new BrowserWindow(windowOptions);

    // Show window when ready
    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Load the app
    const url = isDev
        ? `http://localhost:${PORT}`
        : `http://${HOST}:${PORT}`;

    logToFile(`Loading URL: ${url}`);

    if (verboseStartup) {
        mainWindow.webContents.on("did-start-loading", () => {
            const currentUrl = mainWindow.webContents.getURL();
            logToFile(`Window started loading: ${currentUrl}`);
        });

        mainWindow.webContents.on("did-finish-load", () => {
            const currentUrl = mainWindow.webContents.getURL();
            logToFile(`Window finished loading: ${currentUrl}`);
            const title = mainWindow.webContents.getTitle();
            logToFile(`Page title: ${title}`);
        });

        mainWindow.webContents.on("did-navigate", (event, navigationUrl) => {
            logToFile(`Window navigated to: ${navigationUrl}`);
        });

        mainWindow.webContents.on("did-navigate-in-page", (event, navigationUrl) => {
            logToFile(`Window navigated in-page to: ${navigationUrl}`);
        });
    }

    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
        logToFile(`Window failed to load: ${validatedURL}`, "ERROR");
        logToFile(`Error code: ${errorCode}, Description: ${errorDescription}`, "ERROR");
    });

    mainWindow.loadURL(url);

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    // Prevent navigation to external URLs
    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== `http://${HOST}:${PORT}` &&
            parsedUrl.origin !== `http://localhost:${PORT}`) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

/**
 * Database backup helpers
 */
function getBackupDir() {
    return path.join(app.getPath("userData"), "backups");
}

function getDbPath() {
    return path.join(app.getPath("userData"), "posman.db");
}

function performBackup() {
    const dbPath = getDbPath();
    const backupDir = getBackupDir();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const backupPath = path.join(backupDir, `posman-backup-${today}.db`);

    if (!fs.existsSync(dbPath)) {
        logToFile("Backup skipped: DB file not found");
        return null;
    }

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.copyFileSync(dbPath, backupPath);
    logToFile(`Database backed up to: ${backupPath}`);
    return backupPath;
}

function runDailyAutoBackup() {
    try {
        const backupDir = getBackupDir();
        const today = new Date().toISOString().slice(0, 10);
        const backupPath = path.join(backupDir, `posman-backup-${today}.db`);
        if (fs.existsSync(backupPath)) {
            logToFile("Auto-backup skipped: today's backup already exists");
            return;
        }
        performBackup();
    } catch (err) {
        logToFile(`Auto-backup failed (non-fatal): ${err.message}`, "WARN");
    }
}

// IPC: silent thermal print via Electron — no print dialog
ipcMain.handle("print-receipt", async (event, htmlContent, printerName) => {
    if (!mainWindow) return { success: false, failureReason: "No main window" };
    return new Promise((resolve) => {
        const escaped = JSON.stringify(htmlContent);
        const injectScript = `
            (() => {
                const prev = document.getElementById('__print_overlay__');
                if (prev) prev.remove();
                const prevStyle = document.getElementById('__print_style__');
                if (prevStyle) prevStyle.remove();

                const overlay = document.createElement('div');
                overlay.id = '__print_overlay__';
                overlay.innerHTML = ${escaped};

                const style = document.createElement('style');
                style.id = '__print_style__';
                style.textContent =
                    '@page { size: 80mm auto; margin: 0; } ' +
                    '@media screen { #__print_overlay__ { display: none !important; } } ' +
                    '@media print { body > * { display: none !important; } #__print_overlay__ { display: block !important; position: static; } }';
                document.head.appendChild(style);
                document.body.appendChild(overlay);
            })();
        `;
        const printOptions = { silent: true, printBackground: false };
        if (printerName) printOptions.deviceName = printerName;
        mainWindow.webContents.executeJavaScript(injectScript).then(() => {
            mainWindow.webContents.print(printOptions, (success, failureReason) => {
                const cleanupScript = `
                    (() => {
                        const el = document.getElementById('__print_overlay__');
                        if (el) el.remove();
                        const st = document.getElementById('__print_style__');
                        if (st) st.remove();
                    })();
                `;
                mainWindow.webContents.executeJavaScript(cleanupScript).catch(() => {});
                logToFile(`print-receipt: success=${success}${failureReason ? ", reason=" + failureReason : ""}`);
                resolve({ success, failureReason: failureReason || null });
            });
        }).catch((err) => {
            logToFile(`print-receipt IPC error: ${err.message}`, "ERROR");
            resolve({ success: false, failureReason: err.message });
        });
    });
});

// IPC: list available system printers
ipcMain.handle("get-printers", async () => {
    if (!mainWindow) return [];
    try {
        return await mainWindow.webContents.getPrintersAsync();
    } catch (err) {
        logToFile(`get-printers IPC error: ${err.message}`, "ERROR");
        return [];
    }
});

// IPC: manual backup triggered from admin UI via Next.js API route
ipcMain.handle("backup-database", async () => {
    try {
        const backupPath = performBackup();
        if (!backupPath) return { success: false, error: "Database file not found" };
        return { success: true, path: backupPath };
    } catch (err) {
        logToFile(`Manual backup failed: ${err.message}`, "ERROR");
        return { success: false, error: err.message };
    }
});

/**
 * App lifecycle handlers
 */
app.whenReady().then(async () => {
    // Enforce single instance — if another JK PosMan is already open, focus it and quit this one.
    if (!app.requestSingleInstanceLock()) {
        logToFile("Another instance is already running — quitting duplicate");
        app.quit();
        return;
    }
    // When a second instance tries to open, bring the existing window to the front.
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    logToFile("App is ready, creating window with loading screen...");
    createWindow();

    // Show a loading page immediately so the user sees something while the server starts.
    const loadingPage = "data:text/html;charset=utf-8," + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>JK PosMan</title>
<style>*{margin:0;box-sizing:border-box}
body{background:#0f172a;color:#94a3b8;font-family:system-ui,sans-serif;
display:flex;justify-content:center;align-items:center;height:100vh}
.card{text-align:center;padding:2rem}
h2{color:#e2e8f0;font-size:1.5rem;margin-bottom:.5rem}
.sub{font-size:.9rem;margin-bottom:1.5rem}
.hint{font-size:.75rem;opacity:.5;margin-top:1rem}
.spinner{width:36px;height:36px;border:3px solid #1e3a5f;border-top-color:#3b82f6;
border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="card">
<div class="spinner"></div>
<h2>JK PosMan</h2>
<p class="sub">Starting application, please wait…</p>
<p class="hint">First launch initialises the database and may take up to a minute.</p>
</div></body></html>`);
    mainWindow.loadURL(loadingPage);

    try {
        logToFile("Starting Next.js server...");
        await startNextServer();
        logToFile("Server ready, loading app URL...");
        mainWindow.loadURL(`http://${HOST}:${PORT}`);
        logToFile("App URL load initiated");

        // Warm bootstrap + backup without blocking first paint
        void (async () => {
            await checkStartupBootstrapStatus();
            await checkLicenseStatus();
            runDailyAutoBackup();
        })();

        // Auto-updater: defer so first window is not competing on startup I/O
        if (isProduction && autoUpdater) {
            setTimeout(() => {
                logToFile("Checking for updates (deferred)...");
                autoUpdater.checkForUpdatesAndNotify().catch((err) => {
                    logToFile(`Auto-updater error: ${err.message}`, "ERROR");
                });
            }, 5000);
        }
    } catch (error) {
        logToFile(`Failed to start application: ${error.message}`, "ERROR");
        logToFile(`Error stack: ${error.stack}`, "ERROR");

        // Show error inside the window instead of a blocking dialog so the user can still
        // read the message without the app becoming unresponsive.
        const errorPage = "data:text/html;charset=utf-8," + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>JK PosMan — Startup Error</title>
<style>*{margin:0;box-sizing:border-box}
body{background:#0f172a;color:#94a3b8;font-family:system-ui,sans-serif;
display:flex;justify-content:center;align-items:center;height:100vh}
.card{background:#1e293b;border-radius:8px;padding:2rem;max-width:520px;width:90%}
h2{color:#f87171;margin-bottom:.75rem}p{line-height:1.6;margin-bottom:.5rem}
.path{background:#0f172a;border-radius:4px;padding:.5rem;font-size:.8rem;word-break:break-all;margin-top:.5rem}
button{margin-top:1.25rem;padding:.5rem 1.25rem;background:#3b82f6;color:#fff;
border:none;border-radius:4px;cursor:pointer;font-size:.9rem}
button:hover{background:#2563eb}</style></head>
<body><div class="card">
<h2>Failed to start JK PosMan</h2>
<p>${error.message.replace(/</g,"&lt;")}</p>
<p>Check the log file for details:</p>
<div class="path">${logFile}</div>
<button onclick="location.reload()">Retry</button>
</div></body></html>`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(errorPage);
        }
    }
});

// Auto-updater: prompt the user to restart when a new version is ready
if (autoUpdater) autoUpdater.on("update-downloaded", () => {
    logToFile("Update downloaded, prompting user to restart");
    dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message: "A new version of JK PosMan has been downloaded.",
        detail: "Restart the app now to apply the update, or do it later.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
    }).then(({ response }) => {
        if (response === 0) {
            logToFile("User chose to restart for update");
            autoUpdater.quitAndInstall();
        } else {
            logToFile("User deferred restart");
        }
    });
});

app.on("window-all-closed", () => {
    logToFile("All windows closed");
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== "darwin") {
        logToFile("Quitting application");
        app.quit();
    }
});

app.on("activate", () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("before-quit", () => {
    // Clean up: kill Next.js server process
    if (nextServer) {
        try {
            nextServer.kill();
            logToFile("Next.js server process terminated");
        } catch (error) {
            logToFile(`Error terminating server: ${error.message}`, "ERROR");
        }
    }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
    contents.on("new-window", (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Log uncaught exceptions
process.on("uncaughtException", (error) => {
    logToFile(`Uncaught Exception: ${error.message}`, "ERROR");
    logToFile(`Stack: ${error.stack}`, "ERROR");
});

process.on("unhandledRejection", (reason, promise) => {
    logToFile(`Unhandled Rejection at: ${promise}`, "ERROR");
    logToFile(`Reason: ${reason}`, "ERROR");
});

