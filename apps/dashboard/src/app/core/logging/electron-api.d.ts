/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RendererProfileRequest {
    readonly operation: "list" | "create" | "update" | "switch" | "choose-avatar";
    readonly nickname?: string;
    readonly profileId?: string;
}

export interface RendererProfileResponse {
    readonly profiles: readonly {
        readonly id: string;
        readonly nickname: string;
        readonly avatarDataUrl?: string;
        readonly isActive: boolean;
        readonly createdAt: string;
        readonly updatedAt: string;
    }[];
    readonly activeProfileId: string;
}

export interface RendererLogRequest {
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

declare global {
    interface Window {
        readonly electronAPI?: {
            readonly profiles: {
                request(request: RendererProfileRequest): Promise<RendererProfileResponse>;
            };
            readonly logging: {
                write(request: RendererLogRequest): Promise<{ readonly accepted: true }>;
            };
        };
    }
}

export {};
