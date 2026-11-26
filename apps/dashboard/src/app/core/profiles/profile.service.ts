/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from "@angular/core";
import type { ProfileRequest, ProfileResponse } from "./profile.types";

@Injectable({ providedIn: "root" })
export class ProfileService {
    async list(): Promise<ProfileResponse> {
        return this.request({ operation: "list" });
    }

    async create(nickname: string): Promise<ProfileResponse> {
        return this.request({ operation: "create", nickname });
    }

    async update(profileId: string, nickname: string): Promise<ProfileResponse> {
        return this.request({ operation: "update", profileId, nickname });
    }

    async switch(profileId: string): Promise<ProfileResponse> {
        return this.request({ operation: "switch", profileId });
    }

    async chooseAvatar(profileId: string): Promise<ProfileResponse> {
        return this.request({ operation: "choose-avatar", profileId });
    }

    private request(request: ProfileRequest): Promise<ProfileResponse> {
        const api = window.electronAPI?.profiles;
        if (!api) {
            return Promise.reject(new Error("The TaleMaster desktop profile API is unavailable."));
        }

        return api.request(request);
    }
}
