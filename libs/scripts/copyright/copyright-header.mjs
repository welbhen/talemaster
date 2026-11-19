/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export const COPYRIGHT_LINES = [
    "Copyright 2026 Welberth Marques",
    "github.com/welbhen/talemaster",
    "SPDX-License-Identifier: Apache-2.0",
];

const blockHeader = `/**\n${COPYRIGHT_LINES.map((line) => ` * ${line}`).join("\n")}\n */`;
const htmlHeader = `<!--\n${COPYRIGHT_LINES.map((line) => ` * ${line}`).join("\n")}\n-->`;

export const HEADER_BY_EXTENSION = new Map([
    [".ts", blockHeader],
    [".tsx", blockHeader],
    [".js", blockHeader],
    [".jsx", blockHeader],
    [".mjs", blockHeader],
    [".cjs", blockHeader],
    [".css", blockHeader],
    [".scss", blockHeader],
    [".sass", blockHeader],
    [".less", blockHeader],
    [".html", htmlHeader],
    [".htm", htmlHeader],
    [".svg", htmlHeader],
    [".cts", blockHeader],
    [".mts", blockHeader],
]);

export const EXCLUDED_PATH_SEGMENTS = new Set([
    "node_modules",
    "dist",
    "coverage",
    ".nx",
    ".angular",
    "out",
    "tmp",
]);

export function isEligibleFile(filePath) {
    const segments = filePath.split("/");
    const fileName = segments.at(-1) ?? "";

    if (segments.some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment))) {
        return false;
    }

    if (
        fileName.endsWith(".min.js") ||
        fileName.endsWith(".min.css") ||
        fileName.endsWith(".generated.ts") ||
        fileName.endsWith(".g.ts")
    ) {
        return false;
    }

    const extensionIndex = fileName.lastIndexOf(".");
    if (extensionIndex < 0) {
        return false;
    }

    return HEADER_BY_EXTENSION.has(fileName.slice(extensionIndex).toLowerCase());
}

export function getHeaderForFile(filePath) {
    const extensionIndex = filePath.lastIndexOf(".");
    const extension = filePath.slice(extensionIndex).toLowerCase();

    return HEADER_BY_EXTENSION.get(extension);
}

export function insertHeader(content, header) {
    const hasBom = content.startsWith("\uFEFF");
    const withoutBom = hasBom ? content.slice(1) : content;
    const lineEnding = withoutBom.includes("\r\n") ? "\r\n" : "\n";
    const formattedHeader = header.replace(/\n/g, lineEnding);

    const shebangMatch = withoutBom.match(/^#![^\r\n]*(?:\r\n|\n|\r|$)/);

    if (shebangMatch) {
        const shebang = shebangMatch[0];
        const remainder = withoutBom.slice(shebang.length);

        return `${hasBom ? "\uFEFF" : ""}${shebang}${formattedHeader}${lineEnding}${lineEnding}${remainder}`;
    }

    return `${hasBom ? "\uFEFF" : ""}${formattedHeader}${lineEnding}${lineEnding}${withoutBom}`;
}

export function hasHeader(content, header) {
    const withoutBom = content.startsWith("\uFEFF") ? content.slice(1) : content;

    const lineEnding = withoutBom.includes("\r\n") ? "\r\n" : "\n";
    const formattedHeader = header.replace(/\n/g, lineEnding);

    const shebangMatch = withoutBom.match(/^#![^\r\n]*(?:\r\n|\n|\r|$)/);
    const source = shebangMatch ? withoutBom.slice(shebangMatch[0].length) : withoutBom;

    return source.startsWith(formattedHeader);
}
