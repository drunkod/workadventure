export type JazzSyncPolicy =
    | { mode: "local" }
    | { mode: "peer"; peer: string }
    | { mode: "cloud"; peer: string };

export type JazzSyncPolicyInput = { mode?: string; peer?: string; apiKey?: string };
export type JazzContextSync = { when: "never" } | { peer: string; when: "always" };

const normalize = (value: string | undefined): string | undefined => {
    const normalized = value?.trim();
    return normalized || undefined;
};

const isWebSocketUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        return (url.protocol === "ws:" || url.protocol === "wss:") && url.hostname.length > 0;
    } catch {
        return false;
    }
};

export function resolveJazzSyncPolicy(input: JazzSyncPolicyInput): JazzSyncPolicy {
    const mode = normalize(input.mode);
    const peer = normalize(input.peer);
    const apiKey = normalize(input.apiKey);
    if (!mode) throw new Error("Jazz sync mode is required when Jazz is enabled");
    if (mode === "local") return { mode: "local" };
    if (mode === "peer") {
        if (!peer || !isWebSocketUrl(peer)) throw new Error("Jazz peer mode requires a valid ws:// or wss:// peer");
        return { mode: "peer", peer };
    }
    if (mode === "cloud") {
        if (peer) throw new Error("Jazz cloud mode cannot be combined with a peer");
        if (!apiKey) throw new Error("Jazz cloud mode requires an API key");
        return { mode: "cloud", peer: `wss://cloud.jazz.tools/?key=${encodeURIComponent(apiKey)}` };
    }
    throw new Error(`Invalid Jazz sync mode: ${mode}`);
}

export function jazzContextSync(policy: JazzSyncPolicy): JazzContextSync {
    return policy.mode === "local" ? { when: "never" } : { peer: policy.peer, when: "always" };
}
