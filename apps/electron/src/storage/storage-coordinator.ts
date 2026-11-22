/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

type Operation<T> = () => T | Promise<T>;

interface MutationRequest {
    readonly kind: "mutation";
    readonly operation: Operation<unknown>;
    readonly resolve: (value: unknown) => void;
    readonly reject: (reason?: unknown) => void;
}

interface SnapshotRequest {
    readonly kind: "snapshot";
    readonly operation: Operation<unknown>;
    readonly resolve: (value: unknown) => void;
    readonly reject: (reason?: unknown) => void;
}

type StorageRequest = MutationRequest | SnapshotRequest;

/**
 * Coordinates persistent mutations and consistent storage snapshots.
 *
 * Mutations already running may execute concurrently. A snapshot waits for
 * those mutations to finish and prevents later mutations from starting until
 * the snapshot operation settles. Requests are scheduled in FIFO order.
 */
export interface StorageCoordinator {
    runMutation<T>(operation: Operation<T>): Promise<T>;
    createSnapshot<T>(operation: Operation<T>): Promise<T>;
}

export function createStorageCoordinator(): StorageCoordinator {
    const queue: StorageRequest[] = [];
    let activeMutations = 0;
    let snapshotActive = false;

    function startMutation(request: MutationRequest): void {
        activeMutations++;

        void Promise.resolve()
            .then(request.operation)
            .then(request.resolve, request.reject)
            .finally(() => {
                activeMutations--;
                pump();
            });
    }

    function startSnapshot(request: SnapshotRequest): void {
        snapshotActive = true;

        void Promise.resolve()
            .then(request.operation)
            .then(request.resolve, request.reject)
            .finally(() => {
                snapshotActive = false;
                pump();
            });
    }

    function pump(): void {
        if (snapshotActive || queue.length === 0) {
            return;
        }

        const next = queue[0];

        if (next.kind === "snapshot") {
            if (activeMutations > 0) {
                return;
            }

            queue.shift();
            startSnapshot(next);
            return;
        }

        // Start the contiguous batch of mutations ahead of the next snapshot.
        while (queue[0]?.kind === "mutation") {
            startMutation(queue.shift() as MutationRequest);
        }
    }

    function enqueue<T>(kind: StorageRequest["kind"], operation: Operation<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const request = {
                kind,
                operation,
                resolve: (value: unknown) => resolve(value as T),
                reject,
            };

            queue.push(request as StorageRequest);
            pump();
        });
    }

    return {
        runMutation: <T>(operation: Operation<T>) => enqueue("mutation", operation),
        createSnapshot: <T>(operation: Operation<T>) => enqueue("snapshot", operation),
    };
}
