import { describe, expect, it } from "vitest";
import { isPointInsideMapBounds } from "../../../../src/front/Phaser/UserInput/MapBoundsUtils";

describe("isPointInsideMapBounds", () => {
    const bounds = { widthInPixels: 100, heightInPixels: 60 };

    it("returns true for inside points", () => {
        expect(isPointInsideMapBounds({ x: 0, y: 0 }, bounds)).toBe(true);
        expect(isPointInsideMapBounds({ x: 99, y: 59 }, bounds)).toBe(true);
        expect(isPointInsideMapBounds({ x: 50, y: 10 }, bounds)).toBe(true);
    });

    it("returns false for outside points", () => {
        expect(isPointInsideMapBounds({ x: -1, y: 10 }, bounds)).toBe(false);
        expect(isPointInsideMapBounds({ x: 10, y: -1 }, bounds)).toBe(false);
        expect(isPointInsideMapBounds({ x: 100, y: 10 }, bounds)).toBe(false);
        expect(isPointInsideMapBounds({ x: 10, y: 60 }, bounds)).toBe(false);
    });
});
