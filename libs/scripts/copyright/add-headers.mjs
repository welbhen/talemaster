/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

import { getHeaderForFile, hasHeader, insertHeader, isEligibleFile } from "./copyright-header.mjs";

const dryRun = process.argv.includes("--dry-run");

function getTrackedFiles() {
    const output = execFileSync("git", ["ls-files", "-z"], {
        encoding: "utf8",
    });

    return output.split("\0").filter(Boolean);
}

async function main() {
    const files = getTrackedFiles().filter(isEligibleFile);

    let updated = 0;
    let skipped = 0;

    for (const filePath of files) {
        const content = await readFile(filePath, "utf8");
        const header = getHeaderForFile(filePath);

        if (hasHeader(content, header)) {
            skipped++;
            continue;
        }

        if (dryRun) {
            console.log(`[DRY RUN] Would add header: ${filePath}`);
            updated++;
            continue;
        }

        const updatedContent = insertHeader(content, header);

        await writeFile(filePath, updatedContent, "utf8");

        console.log(`Added header: ${filePath}`);
        updated++;
    }

    console.log(
        `\nCopyright header scan complete. Updated: ${updated}. Already compliant: ${skipped}.`,
    );

    if (dryRun) {
        console.log("Dry-run mode: no files were modified.");
    }
}

main().catch((error) => {
    console.error("Failed to add copyright headers:", error);
    process.exitCode = 1;
});
