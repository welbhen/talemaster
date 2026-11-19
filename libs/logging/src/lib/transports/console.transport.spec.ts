import { ConsoleTransport } from "./console.transport";
import type { LogEntry } from "../logger.types";

describe("ConsoleTransport", () => {
    it("routes warnings and errors to the correct console methods", () => {
        const output = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const transport = new ConsoleTransport(output);

        const baseEntry: LogEntry = {
            timestamp: "2026-11-18T12:00:00.000Z",
            context: "Test",
            message: "Message",
            level: "WARN",
        };

        transport.write(baseEntry);
        transport.write({ ...baseEntry, level: "ERROR" });
        transport.write({ ...baseEntry, level: "LOG" });
        transport.write({ ...baseEntry, level: "DEBUG" });

        expect(output.warn).toHaveBeenCalledTimes(1);
        expect(output.error).toHaveBeenCalledTimes(1);
        expect(output.log).toHaveBeenCalledTimes(2);
    });
});
