import { createLoggingIpcAdapter } from "./logging.ipc-adapter";

type Handler = (request: unknown) => unknown;

function createRegistrarCapture() {
    const handlers = new Map<string, Handler>();
    return {
        handlers,
        registrar: {
            handle(channel: string, handler: Handler) {
                handlers.set(channel, handler);
            },
        },
    };
}

describe("createLoggingIpcAdapter", () => {
    it("validates input before writing to the logger", () => {
        const logger = {
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        };
        const adapter = createLoggingIpcAdapter(logger as never);
        const capture = createRegistrarCapture();

        adapter.register(capture.registrar as never);

        expect(() =>
            capture.handlers.get("logging:write")?.({
                level: "TRACE",
                message: "invalid",
            }),
        ).toThrow("Invalid log level.");

        expect(logger.log).not.toHaveBeenCalled();
    });

    it("forwards valid log entries", () => {
        const logger = {
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        };
        const adapter = createLoggingIpcAdapter(logger as never);
        const capture = createRegistrarCapture();

        adapter.register(capture.registrar as never);

        expect(
            capture.handlers.get("logging:write")?.({
                level: "LOG",
                message: "renderer initialized",
            }),
        ).toEqual({ accepted: true });

        expect(logger.log).toHaveBeenCalledWith("renderer initialized", undefined);
    });

    it("rejects oversized metadata strings", () => {
        const adapter = createLoggingIpcAdapter({
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        } as never);
        const capture = createRegistrarCapture();

        adapter.register(capture.registrar as never);

        expect(() =>
            capture.handlers.get("logging:write")?.({
                level: "LOG",
                message: "message",
                metadata: { payload: "x".repeat(2_001) },
            }),
        ).toThrow("Log metadata value is too long.");
    });
});
