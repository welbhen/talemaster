import { createLogEntry, serializeError, serializeMetadata } from "./log-formatter";

describe("log formatter", () => {
    it("creates entries with ISO timestamps and context", () => {
        const entry = createLogEntry("LOG", "Database", "Connected");

        expect(entry).toMatchObject({
            level: "LOG",
            context: "Database",
            message: "Connected",
        });
        expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });

    it("serializes errors with their stack", () => {
        const error = new Error("Connection failed");
        const result = serializeError(error);

        expect(result.name).toBe("Error");
        expect(result.message).toBe("Connection failed");
        expect(result.stack).toContain("Connection failed");
    });

    it("serializes error causes", () => {
        const cause = new Error("Underlying failure");
        const error = new Error("Operation failed", { cause });

        expect(serializeError(error).cause).toMatchObject({
            message: "Underlying failure",
        });
    });

    it("serializes aggregate errors", () => {
        const error = new AggregateError(
            [new Error("First"), new Error("Second")],
            "Multiple failures",
        );

        expect(serializeError(error).errors).toHaveLength(2);
    });

    it("handles circular metadata", () => {
        const metadata: Record<string, unknown> = {};
        metadata["self"] = metadata;

        expect(serializeMetadata(metadata)).toEqual({
            self: "[Circular]",
        });
    });

    it("serializes bigint values", () => {
        expect(serializeMetadata({ id: 123n })).toEqual({
            id: "123",
        });
    });

    it("omits metadata when none is supplied", () => {
        expect(serializeMetadata()).toBeUndefined();
    });
});
