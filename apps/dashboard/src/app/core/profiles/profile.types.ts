/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Profile {
    readonly id: string;
    readonly nickname: string;
    readonly avatarDataUrl?: string;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface ProfileResponse {
    readonly profiles: readonly Profile[];
    readonly activeProfileId: string;
}

export type ProfileRequest =
    | { readonly operation: "list" }
    | { readonly operation: "create"; readonly nickname: string }
    | { readonly operation: "update"; readonly profileId: string; readonly nickname: string }
    | { readonly operation: "switch"; readonly profileId: string }
    | { readonly operation: "choose-avatar"; readonly profileId: string };
