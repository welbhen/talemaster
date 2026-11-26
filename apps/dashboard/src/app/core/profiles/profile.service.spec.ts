/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestBed } from "@angular/core/testing";
import { ProfileService } from "./profile.service";

describe("ProfileService", () => {
    let request: jest.Mock;

    beforeEach(() => {
        request = jest.fn().mockResolvedValue({ profiles: [], activeProfileId: "" });
        Object.defineProperty(window, "electronAPI", {
            configurable: true,
            value: { profiles: { request } },
        });
        TestBed.configureTestingModule({ providers: [ProfileService] });
    });

    afterEach(() => {
        delete (window as { electronAPI?: unknown }).electronAPI;
    });

    it("forwards typed profile operations to the preload API", async () => {
        const service = TestBed.inject(ProfileService);
        await service.create("Mage");
        expect(request).toHaveBeenCalledWith({ operation: "create", nickname: "Mage" });
        await service.switch("profile-id");
        expect(request).toHaveBeenCalledWith({ operation: "switch", profileId: "profile-id" });
    });

    it("fails clearly when the application preload API is unavailable", async () => {
        Object.defineProperty(window, "electronAPI", { configurable: true, value: undefined });
        await expect(TestBed.inject(ProfileService).list()).rejects.toThrow("API is unavailable");
    });
});
