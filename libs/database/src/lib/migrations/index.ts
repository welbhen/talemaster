/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { initialMigration } from "./001-initial";
import { applicationPreferencesMigration } from "./002-application-preferences";
import type { Migration } from "./migration.types";

export const migrations: readonly Migration[] = [initialMigration, applicationPreferencesMigration];
