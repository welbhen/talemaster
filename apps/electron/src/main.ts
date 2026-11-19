/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { closeDatabase, initializeDatabase } from "./database/db";
import type { DatabaseContext } from "./database/db.types";

const isDevelopment = !app.isPackaged;

let databaseContext: DatabaseContext | undefined;

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

app.on("before-quit", () => {
    if (!databaseContext) {
        return;
    }

    try {
        closeDatabase(databaseContext);
        databaseContext = undefined;
    } catch (error) {
        console.error("Failed to close the database:", error);
    }
});

void app
    .whenReady()
    .then(() => {
        databaseContext = initializeDatabase({
            directory: join(app.getPath("userData"), "database"),
        });

        createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    })
    .catch((error: unknown) => {
        console.error("Failed to initialize the application:", error);
        app.quit();
    });

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
