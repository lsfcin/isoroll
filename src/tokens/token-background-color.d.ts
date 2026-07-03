type UserLike = {
    isGM?: boolean;
    color?: {
        css?: string;
    } | string;
};
export declare function resolveUserColor(u: UserLike): number | null;
export declare function resolveElevLineColor(token: Token): number;
export {};
