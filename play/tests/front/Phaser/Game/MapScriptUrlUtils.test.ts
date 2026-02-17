import { describe, expect, it, vi } from "vitest";
import { resolveMapScriptUrls } from "../../../../src/front/Phaser/Game/MapScriptUrlUtils";

describe("resolveMapScriptUrls", () => {
    it("resolves relative and absolute script URLs safely", () => {
        const urls = resolveMapScriptUrls(
            "./script.js\nhttps://cdn.example.com/extra.js",
            "/mock-maps/starter/map.json",
            "http://localhost:8080/_/global/mock-maps/starter/map.json?alone=true"
        );

        expect(urls).toEqual([
            "http://localhost:8080/mock-maps/starter/script.js",
            "https://cdn.example.com/extra.js",
        ]);
    });

    it("skips invalid script URLs instead of throwing", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const urls = resolveMapScriptUrls(
            "./ok.js\nhttps://[broken-host\n ",
            "/mock-maps/starter/map.json",
            "http://localhost:8080/_/global/mock-maps/starter/map.json"
        );

        expect(urls).toEqual(["http://localhost:8080/mock-maps/starter/ok.js"]);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
