/* eslint-disable @typescript-eslint/no-require-imports */
// Electron main process uses CommonJS (require) not ES modules
const { app, BrowserWindow, shell } = require("electron");
const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const isProduction = !isDev;

let mainWindow = null;
let nextServer = null;
const PORT = process.env.PORT || 3000;
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
        // When packaged, __dirname points to app.asar/electron, so we need to adjust the path
        let nextPath, serverPath;
        if (app.isPackaged) {
            // In packaged app, files are in app.asar
            // __dirname is app.asar/electron, so .next is at app.asar/.next
            nextPath = path.join(__dirname, "../.next/standalone");
            serverPath = path.join(nextPath, "server.js");
            // For ASAR archives, we might need to use app.getAppPath() instead
            const appPath = app.getAppPath();
            logToFile(`App path: ${appPath}`);
            logToFile(`__dirname: ${__dirname}`);
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

        // Use Electron's bundled Node.js instead of system Node.js
        // This ensures the app works without requiring Node.js installation on target machine
        const { fork } = require("child_process");

        logToFile(`Server script path: ${serverPath}`);
        logToFile(`Working directory: ${nextPath}`);
        logToFile(`Process execPath: ${process.execPath}`);
        logToFile(`Process execPath exists: ${fs.existsSync(process.execPath)}`);

        // For Electron apps, fork() without execPath will use the current Node.js runtime
        // Since Electron IS Node.js, this should work. However, if system Node.js is available,
        // it might use that instead. To ensure we use Electron's Node.js, we need to use execPath.
        // But fork() with execPath pointing to Electron executable doesn't work.
        // Solution: Use fork() without execPath, but set NODE_PATH to ensure it uses Electron's modules
        env.NODE_PATH = path.join(__dirname, "../node_modules");

        // Use fork without execPath - this will use the current process's Node.js (Electron's Node.js)
        // This is the recommended approach for Electron apps
        nextServer = fork(serverPath, [], {
            cwd: nextPath,
            env: env,
            stdio: ["ignore", "pipe", "pipe", "ipc"],
            // Don't use execPath - let it use the current Node.js runtime (Electron)
        });

        // Log server output for debugging
        if (nextServer.stdout) {
            nextServer.stdout.on("data", (data) => {
                logToFile(`Next.js server stdout: ${data.toString().trim()}`);
            });
        }
        if (nextServer.stderr) {
            nextServer.stderr.on("data", (data) => {
                logToFile(`Next.js server stderr: ${data.toString().trim()}`, "ERROR");
            });
        }

        nextServer.on("error", (error) => {
            logToFile(`Failed to start Next.js server: ${error.message}`, "ERROR");
            logToFile(`Error code: ${error.code}`, "ERROR");
            logToFile(`Error syscall: ${error.syscall}`, "ERROR");
            logToFile(`Error stack: ${error.stack}`, "ERROR");
            logToFile(`Executable path: ${process.execPath}`, "ERROR");
            logToFile(`Executable exists: ${fs.existsSync(process.execPath)}`, "ERROR");
            reject(error);
        });

        nextServer.on("exit", (code, signal) => {
            if (code !== 0 && code !== null) {
                logToFile(`Next.js server exited with code ${code} and signal ${signal}`, "ERROR");
            }
        });

        // Wait for server to be ready
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds (60 * 500ms)
        const checkServer = setInterval(() => {
            attempts++;
            const http = require("http");
            logToFile(`Checking server readiness (attempt ${attempts}/${maxAttempts})...`);
            const req = http.get(`http://${HOST}:${PORT}`, (res) => {
                if (res.statusCode === 200) {
                    clearInterval(checkServer);
                    logToFile("Next.js server started successfully!");
                    resolve();
                } else {
                    logToFile(`Server responded with status ${res.statusCode}`);
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
        nextServer.kill();
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

