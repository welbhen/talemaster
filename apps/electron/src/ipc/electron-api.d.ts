export interface ElectronRendererLogRequest {
    readonly level: "LOG" | "WARN" | "DEBUG" | "ERROR";
    readonly message: string;
    readonly context?: string;
    readonly metadata?: Readonly<
        Record<string, string | number | boolean | null>
    >;
    readonly error?: {
        readonly name: string;
        readonly message: string;
        readonly stack?: string;
    };
}

export interface ElectronDatabaseHealth {
    readonly status: "ok";
    readonly path: string;
    readonly open: boolean;
}

declare global {
    interface Window {
        readonly electronAPI: {
            readonly platform: string;
            readonly logging: {
                write(
                    request: ElectronRendererLogRequest,
                ): Promise<{ readonly accepted: true }>;
            };
            readonly database: {
                health(): Promise<ElectronDatabaseHealth>;
            };
        };
    }
}
