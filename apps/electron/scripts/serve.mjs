/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { watch } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const nxCli = join(workspaceRoot, "node_modules/nx/bin/nx.js");
const electronOutput = join(workspaceRoot, "dist/apps/electron");
const electronBinary = require("electron");
const isWindows = process.platform === "win32";

const children = new Set();
let electronProcess;
let outputWatcher;
let restartTimer;
let restartChain = Promise.resolve();
let shutdownPromise;
let shuttingDown = false;

function startProcess(command, args) {
    const child = spawn(command, args, {
        cwd: workspaceRoot,
        stdio: "inherit",
        windowsHide: false,
    });

    children.add(child);
    child.once("exit", (code, signal) => {
        children.delete(child);
        if (shuttingDown) return;

        if (child === electronProcess) {
            electronProcess = undefined;
            console.log("TaleMaster window closed. Stopping development processes...");
            void shutdown(code ?? (signal ? 1 : 0));
            return;
        }

        if (code !== 0 || signal) {
            console.error(`Development process stopped unexpectedly: ${command} (code: ${code}, signal: ${signal})`);
            void shutdown(code ?? 1);
        }
    });

    child.once("error", (error) => {
        console.error(`Failed to start ${command}:`, error);
        void shutdown(1);
    });

    return child;
}

function waitForExit(child, timeoutMs = 5000) {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();

    return new Promise((resolveExit) => {
        const timeout = setTimeout(() => resolveExit(false), timeoutMs);
        child.once("exit", () => {
            clearTimeout(timeout);
            resolveExit(true);
        });
    });
}

async function stopProcess(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;

    if (isWindows && child.pid) {
        await new Promise((resolveKill) => {
            const killer = spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
                stdio: "ignore",
                windowsHide: true,
            });
            killer.once("error", resolveKill);
            killer.once("exit", resolveKill);
        });
    } else {
        child.kill("SIGTERM");
        const stopped = await waitForExit(child);
        if (!stopped) child.kill("SIGKILL");
    }

    await waitForExit(child, 2000);
}

function isDashboardReady() {
    return new Promise((resolveReady) => {
        const req = request(
            { hostname: "127.0.0.1", port: 4200, path: "/", method: "GET", timeout: 1500 },
            (response) => {
                response.resume();
                resolveReady(response.statusCode !== undefined && response.statusCode < 500);
            },
        );
        req.once("timeout", () => { req.destroy(); resolveReady(false); });
        req.once("error", () => resolveReady(false));
        req.end();
    });
}

async function hasFreshBuild(startedAt) {
    try {
        const [main, preload] = await Promise.all([
            stat(join(electronOutput, "main.js")),
            stat(join(electronOutput, "preload.js")),
        ]);
        return main.mtimeMs >= startedAt && preload.mtimeMs >= startedAt;
    } catch {
        return false;
    }
}

async function waitForStartup(startedAt) {
    const timeoutAt = Date.now() + 120_000;
    while (!shuttingDown && Date.now() < timeoutAt) {
        const [buildReady, dashboardReady] = await Promise.all([
            hasFreshBuild(startedAt),
            isDashboardReady(),
        ]);
        if (buildReady && dashboardReady) return;
        await delay(500);
    }

    if (!shuttingDown) {
        throw new Error("Startup timed out. Check the dashboard server and Electron build output above.");
    }
}

function launchElectron() {
    if (shuttingDown) return;
    console.log("Starting TaleMaster Electron...");
    electronProcess = startProcess(electronBinary, [electronOutput]);
}

async function restartElectron() {
    if (shuttingDown) return;
    const previous = electronProcess;
    electronProcess = undefined;
    if (previous) {
        await stopProcess(previous);
        children.delete(previous);
    }
    if (!shuttingDown) launchElectron();
}

function scheduleRestart() {
    if (shuttingDown) return;
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
        restartChain = restartChain.then(restartElectron).catch((error) => {
            console.error("Could not restart Electron:", error);
            void shutdown(1);
        });
    }, 400);
}

function watchElectronOutput() {
    outputWatcher = watch(electronOutput, (_eventType, filename) => {
        const changedFile = filename?.toString();
        if (changedFile === "main.js" || changedFile === "preload.js") scheduleRestart();
    });
    outputWatcher.on("error", (error) => {
        console.error("Electron output watcher failed:", error);
        void shutdown(1);
    });
}

function shutdown(exitCode = 0) {
    if (shutdownPromise) return shutdownPromise;
    shuttingDown = true;
    if (restartTimer) clearTimeout(restartTimer);
    outputWatcher?.close();

    shutdownPromise = (async () => {
        await Promise.all([...children].map(stopProcess));
        process.exitCode = exitCode;
    })();
    return shutdownPromise;
}

process.on("SIGINT", () => { void shutdown(0); });
process.on("SIGTERM", () => { void shutdown(0); });

async function main() {
    console.log("Starting TaleMaster development environment...");
    const buildStartedAt = Date.now();

    startProcess(process.execPath, [nxCli, "serve", "dashboard"]);
    startProcess(process.execPath, [nxCli, "run", "electron:build:development", "--watch"]);

    await waitForStartup(buildStartedAt);
    if (shuttingDown) return;

    watchElectronOutput();
    launchElectron();
    console.log("TaleMaster is running. Press Ctrl+C to stop all processes.");
}

main().catch(async (error) => {
    console.error(error);
    await shutdown(1);
});
