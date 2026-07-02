type ConfigApp = {
    document: {
        id?: string;
    };
};
export declare function onRenderTokenConfigState(app: ConfigApp): void;
export declare function onCloseTokenConfig(app: ConfigApp): void;
type FlagDoc = {
    getFlag: (m: string, k: string) => unknown;
};
export declare function onRenderTokenConfigTab(app: {
    document: FlagDoc;
}, html: JQuery): void;
export {};
