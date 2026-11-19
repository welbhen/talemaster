import { createDatabaseIpcAdapter } from "./database.ipc-adapter";

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

describe("createDatabaseIpcAdapter", () => {
    it("returns health information without exposing the connection", () => {
        const adapter = createDatabaseIpcAdapter({
            path: "C:/app/data/talemaster.sqlite",
            connection: { open: true },
        } as never);
        const capture = createRegistrarCapture();

        adapter.register(capture.registrar as never);

        expect(
            capture.handlers.get("database:request")?.({
                operation: "health",
            }),
        ).toEqual({
            status: "ok",
            path: "C:/app/data/talemaster.sqlite",
            open: true,
        });
    });

    it("rejects unknown operations and extra properties", () => {
        const adapter = createDatabaseIpcAdapter({
            path: "db.sqlite",
            connection: { open: true },
        } as never);
        const capture = createRegistrarCapture();

        adapter.register(capture.registrar as never);

        expect(() =>
            capture.handlers.get("database:request")?.({
                operation: "executeSql",
            }),
        ).toThrow("Invalid database request.");

        expect(() =>
            capture.handlers.get("database:request")?.({
                operation: "health",
                sql: "DROP TABLE campaigns",
            }),
        ).toThrow("Invalid database request.");
    });
});
