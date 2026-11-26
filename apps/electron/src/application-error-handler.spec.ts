/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Logger } from "@talemaster/logging";

import { handleApplicationError } from "./application-error-handler";

describe("handleApplicationError", () => {
    it("logs the failure and requests application shutdown", () => {
        const logger = { error: jest.fn() } as unknown as Logger;
        const quit = jest.fn();
        const error = new Error("startup failed");

        handleApplicationError("Application initialization failed", error, logger, quit);

        expect(logger.error).toHaveBeenCalledWith("Application initialization failed", error);
        expect(quit).toHaveBeenCalledTimes(1);
    });

    it("requests shutdown even if logging unexpectedly throws", () => {
        const logger = {
            error: jest.fn(() => {
                throw new Error("logging failed");
            }),
        } as unknown as Logger;
        const quit = jest.fn();
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

        try {
            expect(() =>
                handleApplicationError(
                    "Application initialization failed",
                    new Error("failure"),
                    logger,
                    quit,
                ),
            ).not.toThrow();
            expect(quit).toHaveBeenCalledTimes(1);
        } finally {
            consoleError.mockRestore();
        }
    });

    it("uses the console before the logger is available", () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const quit = jest.fn();

        try {
            handleApplicationError("Application initialization failed", "failure", undefined, quit);
            expect(consoleError).toHaveBeenCalledWith("Application initialization failed", "failure");
            expect(quit).toHaveBeenCalledTimes(1);
        } finally {
            consoleError.mockRestore();
        }
    });
});
