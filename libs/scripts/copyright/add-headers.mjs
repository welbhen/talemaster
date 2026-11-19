/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFile, writeFile } from "node:fs/promises";
import { projectFiles } from "./get-tracked-files.mjs";
import { getHeaderForFile, hasHeader, insertHeader } from "./copyright-header.mjs";

const dryRun = process.argv.includes("--dry-run");

async function main() {
    const files = projectFiles;

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
