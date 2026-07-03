export declare class PresetManager {
    static onPreCreateTile(doc: unknown): void;
    static onCreateTile(doc: unknown): void;
    static onCreateToken(doc: unknown): void;
    static onCreateScene(scene: unknown): void;
    static onUpdateTile(doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static onUpdateToken(doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static onUpdateScene(scene: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static onReady(): Promise<void>;
}
