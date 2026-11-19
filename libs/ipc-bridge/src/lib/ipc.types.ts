/**
 * Transport-level contracts only.
 *
 * Feature contracts belong to their owning libraries. The Electron
 * composition root supplies the channel map that combines them.
 */
export interface IpcRequestChannel<TRequest, TResponse> {
    readonly request: TRequest;
    readonly response: TResponse;
}

export type IpcChannelMap<TChannels> = {
    [TKey in keyof TChannels]: IpcRequestChannel<unknown, unknown>;
};

export type IpcRequestOf<TChannel> =
    TChannel extends IpcRequestChannel<infer TRequest, unknown> ? TRequest : never;

export type IpcResponseOf<TChannel> =
    TChannel extends IpcRequestChannel<unknown, infer TResponse> ? TResponse : never;

export type IpcHandler<TRequest, TResponse> = (request: TRequest) => Promise<TResponse> | TResponse;

export interface IpcMainRegistrar<TChannels extends IpcChannelMap<TChannels>> {
    handle<TKey extends keyof TChannels & string>(
        channel: TKey,
        handler: IpcHandler<IpcRequestOf<TChannels[TKey]>, IpcResponseOf<TChannels[TKey]>>,
    ): void;
}

export interface IpcRendererInvoker<TChannels extends IpcChannelMap<TChannels>> {
    invoke<TKey extends keyof TChannels & string>(
        channel: TKey,
        request: IpcRequestOf<TChannels[TKey]>,
    ): Promise<IpcResponseOf<TChannels[TKey]>>;
}
