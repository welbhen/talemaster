/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { closeDatabase, initializeDatabase } from "@talemaster/database";
import type { DatabaseContext } from "@talemaster/database";
import { createApplicationLogger } from "@talemaster/logging";
import type { Logger } from "@talemaster/logging";

import { handleApplicationError } from "./application-error-handler";
import { createDatabaseIpcAdapter } from "./ipc/adapters/database.ipc-adapter";
import { createLoggingIpcAdapter } from "./ipc/adapters/logging.ipc-adapter";
import { createIpcSecurity } from "./ipc/ipc-security";
import { registerIpc, type IpcRegistration } from "./ipc/ipc-registration";
import {
    createApplicationStoragePaths,
    ensureApplicationStorage,
} from "./storage/application-storage";

const isDevelopment = !app.isPackaged;
const storagePaths = createApplicationStoragePaths(app.getPath("userData"));
const rendererPath = join(__dirname, "dashboard/browser/index.html");
let logger: Logger | undefined;
let databaseContext: DatabaseContext | undefined;
let mainWindow: BrowserWindow | null = null;
let ipcRegistration: IpcRegistration | undefined;

function handleFatalError(context: string, error: unknown): void {
    handleApplicationError(context, error, logger, () => app.quit());
}

function createWindow(): void {
    try {
        mainWindow = new BrowserWindow({
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

        mainWindow.on("closed", () => {
            mainWindow = null;
        });

        const loadPromise = isDevelopment
            ? mainWindow.loadURL("http://localhost:4200")
            : mainWindow.loadFile(rendererPath);

        void loadPromise.catch((error: unknown) => {
            handleFatalError("Failed to load the application window", error);
        });
    } catch (error) {
        handleFatalError("Failed to create the application window", error);
    }
}

app.on("before-quit", () => {
    ipcRegistration?.dispose();
    ipcRegistration = undefined;

    if (!databaseContext) return;

    try {
        closeDatabase(databaseContext);
        databaseContext = undefined;
    } catch (error) {
        if (logger) {
            logger.error("Failed to close the database", error);
        } else {
            console.error("Failed to close the database:", error);
        }
    }
});

void app
    .whenReady()
    .then(async () => {
        await ensureApplicationStorage(storagePaths);

        logger = createApplicationLogger(
            {
                directory: storagePaths.logs,
                isDevelopment,
            },
            "Application",
        );

        databaseContext = initializeDatabase({
            directory: storagePaths.database,
        });

        const ipcSecurity = createIpcSecurity({
            getMainWindow: () => mainWindow,
            ...(isDevelopment ? { developmentOrigin: "http://localhost:4200" } : {}),
            productionUrl: pathToFileURL(rendererPath).href,
        });

        ipcRegistration = registerIpc({
            assertTrustedSender: ipcSecurity.assertTrustedSender,
            adapters: [createLoggingIpcAdapter(logger), createDatabaseIpcAdapter(databaseContext)],
        });

        createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    })
    .catch((error: unknown) => {
        handleFatalError("Failed to initialize the application", error);
    });

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
