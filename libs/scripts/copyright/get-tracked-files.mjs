/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isEligibleFile } from "./copyright-header.mjs";

function getProjectFiles() {
    const output = execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        {
            encoding: "utf8",
        },
    );

    return output.split("\0").filter(Boolean);
}

export const projectFiles = getProjectFiles().filter(
    (filePath) => existsSync(filePath) && isEligibleFile(filePath),
);
