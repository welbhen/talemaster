/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { access } from "node:fs/promises";
import { watch } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";
import { request } from "node:http";

const require = createRequire(import.meta.url);
const workspaceRoot = resolve(import.meta.dirname, "../../..");
const nxCli = join(workspaceRoot, "node_modules/nx/bin/nx.js");
const electronOutput = join(workspaceRoot, "dist/apps/electron");
const electronBinary = require("electron");
const isWindows = process.platform === "win32";

const children = new Set();
let electronProcess;
let outputWatcher;
let restartTimer;
let shuttingDown = false;

function startProcess(command, args, options = {}) {
    const child = spawn(command, args, {
        cwd: workspaceRoot,
        stdio: "inherit",
        ...options,
    });

    children.add(child);
    child.once("exit", (code, signal) => {
        children.delete(child);

        if (!shuttingDown && code !== 0 && code !== null) {
            console.error(
                `Development process exited with code ${code}: ${command}`,
            );
            shutdown(code);
        } else if (!shuttingDown && signal) {
            console.error(`Development process stopped: ${command} (${signal})`);
            shutdown(1);
        }
    });

    child.once("error", (error) => {
        console.error(`Failed to start ${command}:`, error);
        shutdown(1);
    });

    return child;
}

function isServerReady() {
    return new Promise((resolveReady) => {
        const req = request(
            {
                hostname: "127.0.0.1",
                port: 4200,
                path: "/",
                method: "GET",
                timeout: 1500,
            },
            (response) => {
                response.resume();
                resolveReady(
                    response.statusCode !== undefined &&
                        response.statusCode < 500,
                );
            },
        );

        req.once("timeout", () => {
            req.destroy();
            resolveReady(false);
        });
        req.once("error", () => resolveReady(false));
        req.end();
    });
}

async function waitForStartup() {
    const timeoutAt = Date.now() + 120_000;

    while (!shuttingDown && Date.now() < timeoutAt) {
        const [mainExists, preloadExists, dashboardReady] = await Promise.all([
            access(join(electronOutput, "main.js")).then(() => true, () => false),
            access(join(electronOutput, "preload.js")).then(() => true, () => false),
            isServerReady(),
        ]);

        if (mainExists && preloadExists && dashboardReady) return;
        await delay(500);
    }

    throw new Error(
        "Development startup timed out. Check the dashboard and Electron build output above.",
    );
}

function launchElectron() {
    if (shuttingDown) return;

    console.log("Starting TaleMaster Electron...");
    electronProcess = startProcess(electronBinary, [electronOutput]);
}

function restartElectron() {
    if (shuttingDown) return;

    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
        if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
        }

        launchElectron();
    }, 300);
}

function watchElectronOutput() {
    outputWatcher = watch(electronOutput, (_eventType, filename) => {
        if (filename !== "main.js" && filename !== "preload.js") return;
        restartElectron();
    });

    outputWatcher.on("error", (error) => {
        console.error("Electron output watcher failed:", error);
        shutdown(1);
    });
}

function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    if (restartTimer) clearTimeout(restartTimer);
    outputWatcher?.close();

    for (const child of children) {
        child.kill();
    }

    setTimeout(() => {
        process.exit(exitCode);
    }, isWindows ? 500 : 100);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
    console.log("Starting TaleMaster development environment...");
    startProcess(process.execPath, [nxCli, "serve", "dashboard"]);
    startProcess(process.execPath, [
        nxCli,
        "run",
        "electron:build:development",
        "--watch",
    ]);

    await waitForStartup();
    if (shuttingDown) return;

    watchElectronOutput();
    launchElectron();

    console.log("TaleMaster is running. Press Ctrl+C to stop all processes.");
}

main().catch((error) => {
    console.error(error);
    shutdown(1);
});
