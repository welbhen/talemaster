/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ElectronRendererLogRequest {
    readonly level: "LOG" | "WARN" | "DEBUG" | "ERROR";
    readonly message: string;
    readonly context?: string;
    readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
    readonly error?: {
        readonly name: string;
        readonly message: string;
        readonly stack?: string;
    };
}

export interface ElectronProfileDto {
    readonly id: string;
    readonly nickname: string;
    readonly avatarDataUrl?: string;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface ElectronProfileResponse {
    readonly profiles: readonly ElectronProfileDto[];
    readonly activeProfileId: string;
}

export type ElectronProfileRequest =
    | { readonly operation: "list" }
    | { readonly operation: "create"; readonly nickname: string }
    | { readonly operation: "update"; readonly profileId: string; readonly nickname: string }
    | { readonly operation: "switch"; readonly profileId: string }
    | { readonly operation: "choose-avatar"; readonly profileId: string };

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
                write(request: ElectronRendererLogRequest): Promise<{ readonly accepted: true }>;
            };
            readonly database: {
                health(): Promise<ElectronDatabaseHealth>;
            };
            readonly profiles: {
                request(request: ElectronProfileRequest): Promise<ElectronProfileResponse>;
            };
        };
    }
}
