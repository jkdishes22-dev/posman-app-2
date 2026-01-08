/* eslint-disable @typescript-eslint/no-require-imports */
// Electron main process uses CommonJS (require) not ES modules
const { app, BrowserWindow, shell, utilityProcess } = require("electron");
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
            
            logToFile(`Checking unpacked path: ${unpackedPath}`);
            logToFile(`Unpacked server.js exists: ${fs.existsSync(unpackedServerPath)}`);
            logToFile(`Checking alt unpacked path: ${altUnpackedPath}`);
            logToFile(`Alt unpacked server.js exists: ${fs.existsSync(altUnpackedServerPath)}`);

            // Prefer unpacked path if it exists (REQUIRED for utilityProcess)
            if (fs.existsSync(unpackedServerPath)) {
                nextPath = unpackedPath;
                serverPath = unpackedServerPath;
                logToFile("Using unpacked ASAR path (app.asar.unpacked)");
            } else if (fs.existsSync(altUnpackedServerPath)) {
                nextPath = altUnpackedPath;
                serverPath = altUnpackedServerPath;
                logToFile("Using alternative unpacked path");
            } else {
                // CRITICAL ERROR: utilityProcess cannot execute files from ASAR
                // The build must have asarUnpack configured correctly
                const error = `Unpacked Next.js server not found. utilityProcess cannot execute files from ASAR archives.\n\nChecked paths:\n- ${unpackedPath}\n- ${altUnpackedPath}\n\nPlease ensure electron-builder.config.js has asarUnpack configured for .next/standalone/**/*`;
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
        };

        // Set NODE_PATH to ensure modules are found
        env.NODE_PATH = path.join(nextPath, "node_modules");

        logToFile(`Server script path: ${serverPath}`);
        logToFile(`Working directory: ${nextPath}`);
        logToFile(`Using utilityProcess API (Electron's recommended approach)`);

        // Use Electron's utilityProcess API instead of child_process.fork()
        // utilityProcess is designed for this use case and uses Electron's embedded Node.js automatically
        try {
            nextServer = utilityProcess.fork(serverPath, [], {
                cwd: nextPath,
                env: env,
            });

            logToFile("utilityProcess.fork() called successfully");
        } catch (error) {
            logToFile(`Failed to create utilityProcess: ${error.message}`, "ERROR");
            logToFile(`Error stack: ${error.stack}`, "ERROR");
            reject(error);
            return;
        }

        // utilityProcess uses message ports for IPC instead of stdio
        // Listen for messages from the child process
        nextServer.on("message", (message) => {
            logToFile(`Next.js server message: ${JSON.stringify(message)}`);
        });

        // Handle utilityProcess errors
        nextServer.on("spawn", () => {
            logToFile("Next.js server process spawned successfully");
        });

        nextServer.on("error", (error) => {
            logToFile(`Failed to start Next.js server: ${error.message}`, "ERROR");
            logToFile(`Error code: ${error.code}`, "ERROR");
            logToFile(`Error stack: ${error.stack}`, "ERROR");
            reject(error);
        });

        nextServer.on("exit", (code, signal) => {
            if (code !== 0 && code !== null) {
                logToFile(`Next.js server exited with code ${code} and signal ${signal}`, "ERROR");
            } else {
                logToFile(`Next.js server exited normally`);
            }
        });

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
    } catch (error) {
        logToFile(`Failed to start application: ${error.message}`, "ERROR");
        logToFile(`Error stack: ${error.stack}`, "ERROR");

        // Show error dialog to user
        const { dialog } = require("electron");
        dialog.showErrorBox(
            "Application Startup Error",
            `Failed to start JK PosMan:\n\n${error.message}\n\nPlease check the log file at:\n${logFile}`
        );

        app.quit();
    }
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

