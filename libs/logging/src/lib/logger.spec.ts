/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { createLogger } from "./logger";
import type { LogEntry } from "./logger.types";
import type { LogTransport } from "./transports/log-transport";

describe("logger", () => {
    let entries: LogEntry[];
    let transport: LogTransport;

    beforeEach(() => {
        entries = [];
        transport = {
            write: jest.fn((entry: LogEntry) => entries.push(entry)),
        };
    });

    it("writes all levels when DEBUG is enabled", () => {
        const logger = createLogger({
            context: "Test",
            minLevel: "DEBUG",
            transports: [transport],
        });

        logger.debug("Debug");
        logger.log("Log");
        logger.warn("Warning");
        logger.error("Error");

        expect(entries.map((entry) => entry.level)).toEqual(["DEBUG", "LOG", "WARN", "ERROR"]);
    });

    it("filters levels below the configured minimum", () => {
        const logger = createLogger({
            context: "Test",
            minLevel: "WARN",
            transports: [transport],
        });

        logger.debug("Debug");
        logger.log("Log");
        logger.warn("Warning");
        logger.error("Error");

        expect(entries.map((entry) => entry.level)).toEqual(["WARN", "ERROR"]);
    });

    it("attaches context and metadata", () => {
        const logger = createLogger({
            context: "Database",
            minLevel: "LOG",
            transports: [transport],
        });

        logger.log("Connected", { database: "main" });

        expect(entries[0]).toMatchObject({
            context: "Database",
            message: "Connected",
            metadata: { database: "main" },
        });
    });

    it("serializes errors", () => {
        const logger = createLogger({
            context: "Database",
            minLevel: "LOG",
            transports: [transport],
        });

        logger.error("Connection failed", new Error("Disk unavailable"));

        expect(entries[0].error).toMatchObject({
            message: "Disk unavailable",
        });
    });

    it("continues with other transports when one fails", () => {
        const failingTransport: LogTransport = {
            write: () => {
                throw new Error("Transport failure");
            },
        };

        const onTransportError = jest.fn();

        const logger = createLogger({
            context: "Test",
            minLevel: "LOG",
            transports: [failingTransport, transport],
            onTransportError,
        });

        expect(() => logger.log("Test message")).not.toThrow();
        expect(transport.write).toHaveBeenCalledTimes(1);
        expect(onTransportError).toHaveBeenCalledTimes(1);
    });

    it("does not throw when the failure handler also fails", () => {
        const failingTransport: LogTransport = {
            write: () => {
                throw new Error("Transport failure");
            },
        };

        const logger = createLogger({
            context: "Test",
            minLevel: "LOG",
            transports: [failingTransport],
            onTransportError: () => {
                throw new Error("Failure handler failure");
            },
        });

        expect(() => logger.log("Test message")).not.toThrow();
    });
});
