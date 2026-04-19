/* eslint-disable @typescript-eslint/no-require-imports */
// Electron main process uses CommonJS (require) not ES modules
const { app, BrowserWindow, shell, utilityProcess, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const isProduction = !isDev;

let mainWindow = null;
let nextServer = null;
// Use custom port 8817 to avoid conflicts with other services (like Metabase on 3000, Next.js dev on 3000, etc.)
const PORT = process.env.PORT || 8817;
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
        // In development, assume Next.js dev server is already running
        logToFile("Development mode: Assuming Next.js dev server is running");
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        // In production, start the Next.js server
        // When packaged, files may be in app.asar or app.asar.unpacked (if asarUnpack is configured)
        let nextPath, serverPath;
        const appPath = app.getAppPath();
        const electronDir = path.dirname(process.execPath);

        if (app.isPackaged) {
            // Check if files are unpacked (outside ASAR) or packed (inside ASAR)
            // When asarUnpack is configured, .next/standalone is extracted to app.asar.unpacked
            // CRITICAL: utilityProcess.fork() CANNOT execute files from inside ASAR archives
            // We MUST use the unpacked path for utilityProcess
            const unpackedPath = path.join(electronDir, "resources", "app.asar.unpacked", ".next", "standalone");
            const unpackedServerPath = path.join(unpackedPath, "server.js");

            // Also check alternative unpacked location (sometimes electron-builder uses different structure)
            const altUnpackedPath = path.join(electronDir, "resources", ".next", "standalone");
            const altUnpackedServerPath = path.join(altUnpackedPath, "server.js");

            // Check if extraResources copied it directly to resources (not in app.asar.unpacked)
            // extraResources places files at resources/.next/standalone (most reliable method)
            const extraResourcesPath = path.join(electronDir, "resources", ".next", "standalone");
            const extraResourcesServerPath = path.join(extraResourcesPath, "server.js");

            // Check if extraFiles copied it to app directory (same level as executable)
            // extraFiles places files at app/.next/standalone (where JK PosMan.exe is)
            const extraFilesPath = path.join(electronDir, ".next", "standalone");
            const extraFilesServerPath = path.join(extraFilesPath, "server.js");

            logToFile(`Checking unpacked path: ${unpackedPath}`);
            logToFile(`Unpacked server.js exists: ${fs.existsSync(unpackedServerPath)}`);
            logToFile(`Checking alt unpacked path: ${altUnpackedPath}`);
            logToFile(`Alt unpacked server.js exists: ${fs.existsSync(altUnpackedServerPath)}`);
            logToFile(`Checking extraResources path: ${extraResourcesPath}`);
            logToFile(`ExtraResources server.js exists: ${fs.existsSync(extraResourcesServerPath)}`);
            logToFile(`Checking extraFiles path: ${extraFilesPath}`);
            logToFile(`ExtraFiles server.js exists: ${fs.existsSync(extraFilesServerPath)}`);

            // Debug: List what's actually in the unpacked directory
            const unpackedDir = path.join(electronDir, "resources", "app.asar.unpacked");
            if (fs.existsSync(unpackedDir)) {
                try {
                    const unpackedContents = fs.readdirSync(unpackedDir, { withFileTypes: true });
                    logToFile(`Unpacked directory exists. Contents: ${unpackedContents.map(d => d.name).join(", ")}`);

                    // Check if .next exists inside unpacked
                    const unpackedNextPath = path.join(unpackedDir, ".next");
                    if (fs.existsSync(unpackedNextPath)) {
                        logToFile(`Found .next inside app.asar.unpacked`);
                        try {
                            const nextContents = fs.readdirSync(unpackedNextPath, { withFileTypes: true });
                            logToFile(`Contents of .next: ${nextContents.map(d => d.name).join(", ")}`);
                        } catch (err) {
                            logToFile(`Could not read .next: ${err.message}`);
                        }
                    }
                } catch (err) {
                    logToFile(`Could not read unpacked directory: ${err.message}`);
                }
            } else {
                logToFile(`Unpacked directory does not exist: ${unpackedDir}`);
            }

            // Also check if .next exists directly in resources
            const resourcesNextPath = path.join(electronDir, "resources", ".next");
            if (fs.existsSync(resourcesNextPath)) {
                logToFile(`Found .next directory directly in resources`);
                try {
                    const nextContents = fs.readdirSync(resourcesNextPath, { withFileTypes: true });
                    logToFile(`Contents of resources/.next: ${nextContents.map(d => d.name).join(", ")}`);
                } catch (err) {
                    logToFile(`Could not read resources/.next: ${err.message}`);
                }
            }

            // Comprehensive debugging: List ALL contents of resources directory
            const resourcesDir = path.join(electronDir, "resources");
            if (fs.existsSync(resourcesDir)) {
                try {
                    logToFile(`Listing ALL contents of resources directory: ${resourcesDir}`);
                    const resourcesContents = fs.readdirSync(resourcesDir, { withFileTypes: true });
                    logToFile(`Resources directory contents (${resourcesContents.length} items):`);
                    resourcesContents.forEach((item) => {
                        const itemPath = path.join(resourcesDir, item.name);
                        if (item.isDirectory()) {
                            logToFile(`  [DIR]  ${item.name}/`);
                            // List first-level contents of directories
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
            } else {
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

            logToFile(`App path: ${appPath}`);
            logToFile(`__dirname: ${__dirname}`);
            logToFile(`Electron dir: ${electronDir}`);
        } else {
            // In development, use normal paths
            nextPath = path.join(__dirname, "../.next/standalone");
            serverPath = path.join(nextPath, "server.js");
        }

        logToFile(`Looking for Next.js server at: ${serverPath}`);
        logToFile(`Next.js path exists: ${fs.existsSync(nextPath)}`);
        logToFile(`Server.js exists: ${fs.existsSync(serverPath)}`);

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
            DB_MODE: process.env.DB_MODE || "mysql",
            // For SQLite: store DB file in user data directory so it persists across app updates
            SQLITE_DB_PATH: path.join(app.getPath("userData"), "posman.db"),
        };

        // Set NODE_PATH to ensure modules are found
        env.NODE_PATH = path.join(nextPath, "node_modules");

        logToFile(`Server script path: ${serverPath}`);
        logToFile(`Working directory: ${nextPath}`);
        logToFile(`Using utilityProcess API (Electron's recommended approach)`);

        // Use Electron's utilityProcess API instead of child_process.fork()
        // utilityProcess is designed for this use case and uses Electron's embedded Node.js automatically
        // CRITICAL: serverPath MUST be outside ASAR archive (in app.asar.unpacked)
        logToFile(`Attempting to fork server at: ${serverPath}`);
        logToFile(`Server path exists: ${fs.existsSync(serverPath)}`);
        logToFile(`Server path is absolute: ${path.isAbsolute(serverPath)}`);

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
            });

            logToFile("utilityProcess.fork() called successfully");
            logToFile(`Process PID: ${nextServer.pid || "unknown"}`);
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
            logToFile(`Next.js server message: ${JSON.stringify(message)}`);
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
        const maxAttempts = 60; // 30 seconds (60 * 500ms)
        const checkServer = setInterval(() => {
            attempts++;
            const http = require("http");
            logToFile(`Checking server readiness (attempt ${attempts}/${maxAttempts}) at http://${HOST}:${PORT}...`);
            const req = http.get(`http://${HOST}:${PORT}`, (res) => {
                logToFile(`Server responded with status ${res.statusCode}`);
                // Check response headers to verify it's our Next.js server, not another service
                const contentType = res.headers["content-type"] || "";
                const serverHeader = res.headers["server"] || "";
                const xPoweredBy = res.headers["x-powered-by"] || "";
                logToFile(`Response Content-Type: ${contentType}`);
                logToFile(`Response Server header: ${serverHeader}`);
                logToFile(`Response X-Powered-By: ${xPoweredBy}`);

                // Next.js typically sets x-powered-by: Next.js
                if (xPoweredBy.includes("Next.js") || contentType.includes("text/html")) {
                    if (res.statusCode === 200) {
                        clearInterval(checkServer);
                        logToFile("Next.js server started successfully!");
                        resolve();
                    } else {
                        logToFile(`Server responded with status ${res.statusCode} (expected 200)`);
                    }
                } else {
                    logToFile(`WARNING: Server response doesn't look like Next.js!`, "ERROR");
                    logToFile(`This might be another service (like Metabase) running on port ${PORT}`, "ERROR");
                }
            });
            req.on("error", (error) => {
                // Server not ready yet, keep waiting
                if (attempts % 10 === 0) {
                    logToFile(`Server not ready yet: ${error.message}`);
                }
            });
            req.setTimeout(2000, () => {
                req.destroy();
            });
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkServer);
            const error = "Server startup timeout after 30 seconds";
            logToFile(error, "ERROR");
            reject(new Error(error));
        }, 30000);
    });
}

/**
 * Create the main application window
 */
function createWindow() {
    // Try to find icon file (Windows uses .ico, macOS/Linux use .png)
    const fs = require("fs");
    let iconPath = null;
    const iconDir = path.join(__dirname, "../public/icons");

    if (process.platform === "win32") {
        // Windows: prefer .ico, fallback to .png
        const icoPath = path.join(iconDir, "JKlogo-512.ico");
        const pngPath = path.join(iconDir, "JKlogo-512.png");
        iconPath = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : null);
    } else {
        // macOS/Linux: use .png
        const pngPath = path.join(iconDir, "JKlogo-512.png");
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

    // Add navigation logging to debug what's actually being loaded
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

    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
        logToFile(`Window failed to load: ${validatedURL}`, "ERROR");
        logToFile(`Error code: ${errorCode}, Description: ${errorDescription}`, "ERROR");
    });

    mainWindow.webContents.on("did-navigate", (event, navigationUrl) => {
        logToFile(`Window navigated to: ${navigationUrl}`);
    });

    mainWindow.webContents.on("did-navigate-in-page", (event, navigationUrl) => {
        logToFile(`Window navigated in-page to: ${navigationUrl}`);
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
 * App lifecycle handlers
 */
app.whenReady().then(async () => {
    try {
        logToFile("App is ready, starting Next.js server...");
        await startNextServer();
        logToFile("Next.js server started, creating window...");
        createWindow();
        logToFile("Window created successfully");

        // Auto-updater: check for updates in production only
        if (isProduction) {
            logToFile("Checking for updates...");
            autoUpdater.checkForUpdatesAndNotify().catch((err) => {
                logToFile(`Auto-updater error: ${err.message}`, "ERROR");
            });
        }
    } catch (error) {
        logToFile(`Failed to start application: ${error.message}`, "ERROR");
        logToFile(`Error stack: ${error.stack}`, "ERROR");

        // Show error dialog to user
        dialog.showErrorBox(
            "Application Startup Error",
            `Failed to start JK PosMan:\n\n${error.message}\n\nPlease check the log file at:\n${logFile}`
        );

        app.quit();
    }
});

// Auto-updater: prompt the user to restart when a new version is ready
autoUpdater.on("update-downloaded", () => {
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

