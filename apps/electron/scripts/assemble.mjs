/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { access, cp, mkdir, rm, copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, "../../..");

const dashboardOutput = join(workspaceRoot, "dist/apps/dashboard/browser");

const electronOutput = join(workspaceRoot, "dist/apps/electron");

const dashboardDestination = join(electronOutput, "dashboard/browser");

const requiredFiles = [
    join(electronOutput, "main.js"),
    join(electronOutput, "preload.js"),
    join(dashboardOutput, "index.html"),
    join(workspaceRoot, "apps/electron/package.json"),
    join(workspaceRoot, "apps/electron/forge.config.cjs"),
];

async function assertFilesExist(files) {
    for (const file of files) {
        try {
            await access(file);
        } catch {
            throw new Error(`Required build artifact not found: ${file}`);
        }
    }
}

async function assemble() {
    await assertFilesExist(requiredFiles);

    await rm(dashboardDestination, {
        recursive: true,
        force: true,
    });

    await mkdir(dirname(dashboardDestination), {
        recursive: true,
    });

    await cp(dashboardOutput, dashboardDestination, {
        recursive: true,
    });

    await copyFile(
        join(workspaceRoot, "apps/electron/package.json"),
        join(electronOutput, "package.json"),
    );

    await copyFile(
        join(workspaceRoot, "apps/electron/forge.config.cjs"),
        join(electronOutput, "forge.config.cjs"),
    );

    console.log("TaleMaster application assembled successfully.");
}

await assemble();
