/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { getHeaderForFile, hasHeader, isEligibleFile } from "./copyright-header.mjs";

function getTrackedFiles() {
    const output = execFileSync("git", ["ls-files", "-z"], {
        encoding: "utf8",
    });

    return output.split("\0").filter(Boolean);
}

async function main() {
    const files = getTrackedFiles().filter(isEligibleFile);
    const missingHeaders = [];

    for (const filePath of files) {
        const content = await readFile(filePath, "utf8");
        const header = getHeaderForFile(filePath);

        if (!hasHeader(content, header)) {
            missingHeaders.push(filePath);
        }
    }

    if (missingHeaders.length > 0) {
        console.error("Missing or invalid copyright headers:\n");

        for (const filePath of missingHeaders) {
            console.error(`  - ${filePath}`);
        }

        console.error("\nRun `npm run copyright:add` to add the required headers.");

        process.exitCode = 1;
        return;
    }

    console.log(`Copyright check passed. ${files.length} source files checked.`);
}

main().catch((error) => {
    console.error("Failed to check copyright headers:", error);
    process.exitCode = 1;
});
