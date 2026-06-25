export declare const CYBERVINCI_REDACTED_SECRET = "[REDACTED]";
export declare function isCyberVinciSensitiveKey(key: string | undefined): boolean;
export declare function redactCyberVinciSecretString(value: string): string;
export declare function redactCyberVinciSecrets<T>(value: T, parentKey?: string): T;
