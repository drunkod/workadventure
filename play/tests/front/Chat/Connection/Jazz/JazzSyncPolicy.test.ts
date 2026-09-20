import { describe, expect, it } from "vitest";
import { jazzContextSync, resolveJazzSyncPolicy } from "../../../../../src/front/Chat/Connection/Jazz/JazzSyncPolicy";

describe("Jazz sync policy", () => {
    it("resolves the frozen local/peer/cloud table", () => {
        const local = resolveJazzSyncPolicy({ mode: " local ", peer: "wss://stale", apiKey: "stale" });
        expect(local).toEqual({ mode: "local" });
        expect(jazzContextSync(local)).toEqual({ when: "never" });

        const peer = resolveJazzSyncPolicy({ mode: "peer", peer: " ws://localhost:1234 " });
        expect(peer).toEqual({ mode: "peer", peer: "ws://localhost:1234" });
        expect(jazzContextSync(peer)).toEqual({ peer: "ws://localhost:1234", when: "always" });

        const cloud = resolveJazzSyncPolicy({ mode: "cloud", apiKey: "a key" });
        expect(cloud).toEqual({ mode: "cloud", peer: "wss://cloud.jazz.tools/?key=a%20key" });
        expect(jazzContextSync(cloud)).toEqual({ peer: "wss://cloud.jazz.tools/?key=a%20key", when: "always" });
    });

    it.each([
        {},
        { mode: "invalid" },
        { mode: "peer" },
        { mode: "peer", peer: "https://example.com" },
        { mode: "peer", peer: "ws://" },
        { mode: "   " },
        { mode: "cloud" },
        { mode: "cloud", apiKey: "key", peer: "wss://example.com" },
    ])("rejects invalid configuration %j", (input) => {
        expect(() => resolveJazzSyncPolicy(input)).toThrow();
    });
});
