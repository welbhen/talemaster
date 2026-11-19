/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from "jest";
import { getJestProjectsAsync } from "@nx/jest";

export default async (): Promise<Config> => ({
    projects: await getJestProjectsAsync(),
});
