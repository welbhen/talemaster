/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslocoPipe } from "@jsverse/transloco";
import { ButtonModule } from "@openng/optimus-ui/button";
import { CardModule } from "@openng/optimus-ui/card";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { LoggerService } from "../logging/logger.service";
import type { Profile } from "./profile.types";
import { ProfileService } from "./profile.service";

@Component({
    selector: "app-profile-management",
    standalone: true,
    imports: [FormsModule, TranslocoPipe, ButtonModule, CardModule, InputTextModule],
    templateUrl: "./profile-management.component.html",
    styleUrl: "./profile-management.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileManagementComponent implements OnInit {
    private readonly profilesService = inject(ProfileService);
    private readonly logger = inject(LoggerService);
    private readonly changeDetector = inject(ChangeDetectorRef);

    protected profiles: readonly Profile[] = [];
    protected activeProfileId = "";
    protected nickname = "";
    protected editingProfileId: string | null = null;
    protected loading = false;
    protected saving = false;
    protected errorMessage = "";

    ngOnInit(): void {
        void this.refresh();
    }

    protected async refresh(): Promise<void> {
        this.loading = true;
        this.errorMessage = "";
        try {
            const result = await this.profilesService.list();
            this.profiles = result.profiles;
            this.activeProfileId = result.activeProfileId;
            if (!this.editingProfileId) {
                this.nickname = result.profiles.find((profile) => profile.isActive)?.nickname ?? "";
            }
        } catch (error) {
            this.errorMessage = "Could not load local profiles.";
            this.logger.error("Failed to load local profiles", error);
        } finally {
            this.loading = false;
            this.changeDetector.markForCheck();
        }
    }

    protected edit(profile: Profile): void {
        this.editingProfileId = profile.id;
        this.nickname = profile.nickname;
        this.errorMessage = "";
    }

    protected startNew(): void {
        this.editingProfileId = null;
        this.nickname = "";
        this.errorMessage = "";
    }

    protected async save(): Promise<void> {
        const normalized = this.nickname.trim();
        if (!normalized || normalized.length > 40) {
            this.errorMessage = "Nickname must contain 1 to 40 characters.";
            return;
        }

        this.saving = true;
        this.errorMessage = "";
        try {
            const result = this.editingProfileId
                ? await this.profilesService.update(this.editingProfileId, normalized)
                : await this.profilesService.create(normalized);
            this.apply(result);
            this.editingProfileId = null;
            this.nickname = result.profiles.find((profile) => profile.isActive)?.nickname ?? "";
        } catch (error) {
            this.errorMessage = error instanceof Error ? error.message : "Could not save profile.";
            this.logger.error("Failed to save local profile", error);
        } finally {
            this.saving = false;
            this.changeDetector.markForCheck();
        }
    }

    protected async switchProfile(profileId: string): Promise<void> {
        try {
            this.apply(await this.profilesService.switch(profileId));
            this.editingProfileId = null;
            this.nickname = this.profiles.find((profile) => profile.isActive)?.nickname ?? "";
        } catch (error) {
            this.errorMessage = "Could not switch profile.";
            this.logger.error("Failed to switch local profile", error);
        } finally {
            this.changeDetector.markForCheck();
        }
    }

    protected async chooseAvatar(profileId: string): Promise<void> {
        try {
            this.apply(await this.profilesService.chooseAvatar(profileId));
        } catch (error) {
            this.errorMessage = error instanceof Error ? error.message : "Could not update profile picture.";
            this.logger.error("Failed to update profile picture", error);
        } finally {
            this.changeDetector.markForCheck();
        }
    }

    private apply(result: { readonly profiles: readonly Profile[]; readonly activeProfileId: string }): void {
        this.profiles = result.profiles;
        this.activeProfileId = result.activeProfileId;
    }
}
