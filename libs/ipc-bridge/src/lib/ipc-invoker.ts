/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IpcChannelMap, IpcRendererInvoker, IpcRequestOf, IpcResponseOf } from "./ipc.types";

/**
 * Creates a typed invoker over the untyped Electron invoke primitive.
 * The cast is isolated at this transport boundary; runtime validation
 * remains the responsibility of the receiving main-process adapter.
 */
export function createIpcInvoker<TChannels extends IpcChannelMap<TChannels>>(
    invokeRaw: (channel: string, request: unknown) => Promise<unknown>,
): IpcRendererInvoker<TChannels> {
    return {
        async invoke<TKey extends keyof TChannels & string>(
            channel: TKey,
            request: IpcRequestOf<TChannels[TKey]>,
        ): Promise<IpcResponseOf<TChannels[TKey]>> {
            return (await invokeRaw(channel, request)) as IpcResponseOf<TChannels[TKey]>;
        },
    };
}
