const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object
 */
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  printReceipt: (html, printerName, options) =>
    ipcRenderer.invoke('print-receipt', html, printerName ?? '', options ?? {}),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  /** Append one line to the desktop app log file (same folder as other JK PosMan logs). */
  logClient: (message, level) => ipcRenderer.invoke('log-client', String(message ?? ''), level ?? 'INFO'),
});

