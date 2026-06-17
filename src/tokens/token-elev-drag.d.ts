export interface TokenElevDrag {
    token: Token;
    startGX: number;
    startGY: number;
    startElev: number;
}
export declare function beginElevDrag(lastCommittedElev: Map<string, number>, token: Token, gx: number, gy: number, elev: number): void;
