import { app, BrowserWindow } from "electron";
import { join } from "node:path";

const isDevelopment = !app.isPackaged;

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    if (isDevelopment) {
        void mainWindow.loadURL("http://localhost:4200");
    } else {
        void mainWindow.loadFile(join(__dirname, "dashboard/browser/index.html"));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
