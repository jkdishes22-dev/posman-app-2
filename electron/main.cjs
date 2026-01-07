/* eslint-disable @typescript-eslint/no-require-imports */
// Electron main process uses CommonJS (require) not ES modules
const { app, BrowserWindow, shell } = require("electron");
const { fork } = require("child_process");
const path = require("path");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const isProduction = !isDev;

let mainWindow = null;
let nextServer = null;
const PORT = process.env.PORT || 3000;
const HOST = "localhost";

/**
 * Start Next.js server
 */
function startNextServer() {
    if (isDev) {
        // In development, assume Next.js dev server is already running
        console.log("Development mode: Assuming Next.js dev server is running");
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        // In production, start the Next.js server
        const nextPath = path.join(__dirname, "../.next/standalone");
        const serverPath = path.join(nextPath, "server.js");

        // Check if standalone build exists
        const fs = require("fs");
        if (!fs.existsSync(serverPath)) {
            console.error("Standalone build not found. Please run: npm run build");
            reject(new Error("Standalone build not found"));
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
        const nodePath = process.execPath; // Electron executable path
        const nodeArgs = [serverPath];

        // Start the Next.js server using Electron's Node.js runtime
        // Note: We use fork instead of spawn to use the same Node.js as Electron
        const { fork } = require("child_process");
        nextServer = fork(serverPath, [], {
            cwd: nextPath,
            env: env,
            stdio: "inherit",
            execPath: nodePath, // Use Electron's bundled Node.js
        });

        nextServer.on("error", (error) => {
            console.error("Failed to start Next.js server:", error);
            reject(error);
        });

        // Wait for server to be ready
        const checkServer = setInterval(() => {
            const http = require("http");
            const req = http.get(`http://${HOST}:${PORT}`, (res) => {
                if (res.statusCode === 200) {
                    clearInterval(checkServer);
                    console.log("Next.js server started successfully");
                    resolve();
                }
            });
            req.on("error", () => {
                // Server not ready yet, keep waiting
            });
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkServer);
            reject(new Error("Server startup timeout"));
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
        await startNextServer();
        createWindow();
    } catch (error) {
        console.error("Failed to start application:", error);
        app.quit();
    }
});

app.on("window-all-closed", () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== "darwin") {
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

