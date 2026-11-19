/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestBed } from "@angular/core/testing";
import { App } from "./app";

describe("App", () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
        }).compileComponents();
    });

    it("should render title", async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        expect(fixture).toBeTruthy();
    });
});
