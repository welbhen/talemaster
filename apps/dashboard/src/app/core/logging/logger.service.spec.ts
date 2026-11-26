/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerService } from "./logger.service";

describe("LoggerService", () => {
    let logger: LoggerService;
    let originalElectronApi: Window["electronAPI"];
    let write: jest.Mock;

    beforeEach(() => {
        logger = new LoggerService();
        originalElectronApi = window.electronAPI;
        write = jest.fn().mockResolvedValue({ accepted: true });
        Object.defineProperty(window, "electronAPI", {
            configurable: true,
            value: { logging: { write } },
        });
        jest.spyOn(console, "info").mockImplementation();
        jest.spyOn(console, "warn").mockImplementation();
        jest.spyOn(console, "debug").mockImplementation();
        jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
        Object.defineProperty(window, "electronAPI", {
            configurable: true,
            value: originalElectronApi,
        });
        jest.restoreAllMocks();
    });

    it("forwards all supported levels through the preload capability", () => {
        logger.debug("debug");
        logger.info("info");
        logger.warn("warning");
        logger.error("failure", new Error("boom"));

        expect(write.mock.calls.map(([request]) => request.level)).toEqual([
            "DEBUG",
            "LOG",
            "WARN",
            "ERROR",
        ]);
        expect(write).toHaveBeenCalledWith(
            expect.objectContaining({
                context: "Renderer",
                message: "failure",
                error: expect.objectContaining({ name: "Error", message: "boom" }),
            }),
        );
    });

    it("normalizes metadata to structured-clone-safe primitive values", () => {
        logger.info("metadata", {
            count: 3,
            valid: true,
            nested: { safe: true },
            unsupported: undefined,
        });

        expect(write).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    count: 3,
                    valid: true,
                    nested: '{"safe":true}',
                }),
            }),
        );
    });

    it("falls back to console when the preload API is unavailable", () => {
        Object.defineProperty(window, "electronAPI", { configurable: true, value: undefined });

        logger.warn("offline");

        expect(console.warn).toHaveBeenCalledWith(
            "[TaleMaster Renderer] offline",
            expect.any(Object),
        );
    });

    it("falls back to console when the IPC promise rejects", async () => {
        write.mockRejectedValue(new Error("IPC unavailable"));

        logger.error("write failed");

        await Promise.resolve();
        expect(console.error).toHaveBeenCalledWith(
            "[TaleMaster Renderer] write failed",
            expect.any(Object),
        );
    });

    it("does not throw when metadata serialization fails", () => {
        const metadata = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error("blocked");
                },
            },
        );

        expect(() => logger.info("safe", metadata)).not.toThrow();
        expect(write).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: { serializationWarning: "Metadata could not be inspected" },
            }),
        );
    });
});
