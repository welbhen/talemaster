/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { createStorageCoordinator } from "./storage-coordinator";

describe("StorageCoordinator", () => {
    it("allows mutations to execute concurrently", async () => {
        const coordinator = createStorageCoordinator();
        const started: string[] = [];
        let releaseFirst!: () => void;
        let releaseSecond!: () => void;

        const firstGate = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        const secondGate = new Promise<void>((resolve) => {
            releaseSecond = resolve;
        });

        const first = coordinator.runMutation(async () => {
            started.push("first");
            await firstGate;
        });
        const second = coordinator.runMutation(async () => {
            started.push("second");
            await secondGate;
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(started).toEqual(["first", "second"]);

        releaseFirst();
        releaseSecond();
        await Promise.all([first, second]);
    });

    it("waits for active mutations and blocks later mutations during a snapshot", async () => {
        const coordinator = createStorageCoordinator();
        const events: string[] = [];
        let releaseMutation!: () => void;
        let releaseSnapshot!: () => void;

        const mutationGate = new Promise<void>((resolve) => {
            releaseMutation = resolve;
        });
        const snapshotGate = new Promise<void>((resolve) => {
            releaseSnapshot = resolve;
        });

        const mutation = coordinator.runMutation(async () => {
            events.push("mutation:start");
            await mutationGate;
            events.push("mutation:end");
        });

        const snapshot = coordinator.createSnapshot(async () => {
            events.push("snapshot:start");
            await snapshotGate;
            events.push("snapshot:end");
        });

        const laterMutation = coordinator.runMutation(() => {
            events.push("later-mutation");
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(events).toEqual(["mutation:start"]);

        releaseMutation();
        await mutation;
        await Promise.resolve();
        await Promise.resolve();

        expect(events).toEqual(["mutation:start", "mutation:end", "snapshot:start"]);

        releaseSnapshot();
        await Promise.all([snapshot, laterMutation]);

        expect(events).toEqual([
            "mutation:start",
            "mutation:end",
            "snapshot:start",
            "snapshot:end",
            "later-mutation",
        ]);
    });

    it("preserves FIFO order between snapshots and mutation batches", async () => {
        const coordinator = createStorageCoordinator();
        const events: string[] = [];

        await coordinator.runMutation(() => events.push("mutation-1"));
        await coordinator.createSnapshot(() => events.push("snapshot-1"));
        await coordinator.runMutation(() => events.push("mutation-2"));
        await coordinator.createSnapshot(() => events.push("snapshot-2"));

        expect(events).toEqual(["mutation-1", "snapshot-1", "mutation-2", "snapshot-2"]);
    });

    it("releases the barrier when a mutation rejects", async () => {
        const coordinator = createStorageCoordinator();
        const expectedError = new Error("mutation failed");

        await expect(coordinator.runMutation(() => Promise.reject(expectedError))).rejects.toBe(
            expectedError,
        );

        await expect(coordinator.createSnapshot(() => "snapshot completed")).resolves.toBe(
            "snapshot completed",
        );
    });

    it("releases the barrier when a snapshot rejects", async () => {
        const coordinator = createStorageCoordinator();
        const expectedError = new Error("snapshot failed");

        await expect(coordinator.createSnapshot(() => Promise.reject(expectedError))).rejects.toBe(
            expectedError,
        );

        await expect(coordinator.runMutation(() => "mutation completed")).resolves.toBe(
            "mutation completed",
        );
    });

    it("handles synchronous operation errors without blocking queued work", async () => {
        const coordinator = createStorageCoordinator();

        await expect(
            coordinator.createSnapshot(() => {
                throw new Error("synchronous failure");
            }),
        ).rejects.toThrow("synchronous failure");

        await expect(coordinator.runMutation(() => 42)).resolves.toBe(42);
    });
});
