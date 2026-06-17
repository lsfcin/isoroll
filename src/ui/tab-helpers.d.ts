export declare function addIsorollTab($html: JQuery, label: string, fieldsetContent: string, onFirstInject?: ($html: JQuery) => void): void;
export declare function flagNumber(flagKey: string, ns: string, value: number, min: number, max: number, step: number): string;
export declare function flagSelect(flagKey: string, ns: string, value: string, options: Array<{
    value: string;
    label: string;
}>): string;
export declare function flagCheckbox(flagKey: string, ns: string, checked: boolean, labelAttrs?: string): string;
