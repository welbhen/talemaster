/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    deserializeStoredDocument,
    parseStoredDocument,
    serializeStoredDocument,
} from "./document-format";

describe("stored document format", () => {
    const document = { formatVersion: 1 as const, content: { type: "doc" as const, content: [] } };

    it("serializes and deserializes the versioned editor envelope", () => {
        expect(deserializeStoredDocument(serializeStoredDocument(document))).toEqual(document);
    });

    it("rejects unknown format versions", () => {
        expect(() => parseStoredDocument({ ...document, formatVersion: 2 })).toThrow(
            "Unsupported document format version",
        );
    });

    it("rejects invalid document roots and JSON", () => {
        expect(() => parseStoredDocument({ formatVersion: 1, content: {} })).toThrow();
        expect(() => deserializeStoredDocument("{")).toThrow("invalid JSON");
    });
});
