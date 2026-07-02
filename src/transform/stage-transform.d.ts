import { IsoProjection } from "./constants";
export declare class CanvasTransform {
    static previewOverride: {
        enabled: boolean;
        transformBg: boolean;
    } | null;
    static previewProjection: IsoProjection | null;
    static lastPreviewState: {
        enabled: boolean;
        transformBg: boolean;
    } | null;
    static activate(): void;
    private static isEnabled;
    static effectiveEnabled(): boolean;
    static gctEffectiveEnabled(): boolean;
    static gctEffectiveTransformBg(): boolean;
    static effectiveProjection(): IsoProjection;
    private static isBackgroundTransformEnabled;
    private static applyStage;
    private static resetStage;
    private static setOutlineVisible;
    static applyCurrentState(): void;
    static refresh(): void;
    static onCanvasReady(): void;
    private static syncHudAfterStageApply;
    static onUpdateScene(scene: Scene, changes: Record<string, unknown>): void;
    static onRenderGridConfig(): void;
    static onCloseGridConfig(): void;
    static onCloseSceneConfig(): void;
}
