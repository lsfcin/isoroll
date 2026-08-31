declare const _default: ({
    ignores: string[];
    files?: undefined;
    languageOptions?: undefined;
    plugins?: undefined;
    rules?: undefined;
} | {
    files: string[];
    languageOptions: {
        parser: typeof tsparser;
        parserOptions: {
            project: string;
        };
    };
    plugins: {
        "@typescript-eslint": {
            configs: Record<string, import("@typescript-eslint/utils/ts-eslint").ClassicConfig.Config>;
            meta: import("@typescript-eslint/utils/ts-eslint").FlatConfig.PluginMeta;
            rules: typeof import("@typescript-eslint/eslint-plugin/use-at-your-own-risk/rules");
        };
        local: {
            rules: Record<string, Rule.RuleModule>;
        };
    };
    rules: any;
    ignores?: undefined;
})[];
export default _default;
import tsparser from "@typescript-eslint/parser";
