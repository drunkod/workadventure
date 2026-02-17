// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { once } from "events";
import { Writable } from "stream";
import fs from "fs";
import path from "path";
import { frontendOnlyMockPlugin } from "../../../vite.config.mts";

type Middleware = (req: any, res: any, next: () => void) => void;

function decodeJwtPayload(token: string): Record<string, unknown> {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
        throw new Error("Missing JWT payload");
    }

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function getMockMiddleware(env: Record<string, string> = {}): Middleware {
    const plugin = frontendOnlyMockPlugin(env);

    let middleware: Middleware | undefined;
    plugin.configureServer?.({
        middlewares: {
            use: (fn: Middleware) => {
                middleware = fn;
            },
        },
    } as any);

    if (!middleware) {
        throw new Error("frontendOnlyMockPlugin middleware was not registered");
    }

    return middleware;
}

async function runMiddleware(middleware: Middleware, url: string, method = "GET") {
    const req = { url, method };
    const headers = new Map<string, string>();
    let body = "";
    let nextCalled = false;
    let ended = false;

    const res = new Writable({
        write(chunk, _encoding, callback) {
            body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
            callback();
        },
    }) as Writable & {
        statusCode: number;
        setHeader: (name: string, value: unknown) => void;
        end: (chunk?: unknown) => void;
    };

    res.statusCode = 200;
    res.setHeader = (name, value) => {
        headers.set(name.toLowerCase(), String(value));
    };
    res.end = (chunk?: unknown) => {
        if (chunk !== undefined) {
            body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        }
        ended = true;
        res.emit("finish");
    };

    middleware(req, res, () => {
        nextCalled = true;
        ended = true;
        res.emit("finish");
    });

    if (!ended && url.startsWith("/mock-maps/")) {
        await once(res, "finish");
    }

    return { statusCode: res.statusCode, body, headers, nextCalled };
}

describe("frontendOnlyMockPlugin", () => {
    it("keeps root favicon asset for dev server static fallback", () => {
        const faviconPath = path.resolve(process.cwd(), "public/favicon.ico");
        expect(fs.existsSync(faviconPath)).toBe(true);
    });

    it("returns JWT-safe auth token on /anonymLogin", async () => {
        const middleware = getMockMiddleware();

        const response = await runMiddleware(middleware, "/anonymLogin", "POST");
        const payload = JSON.parse(response.body) as { authToken: string; userUuid: string };

        expect(response.statusCode).toBe(200);
        expect(payload.userUuid).toBeTruthy();
        expect(payload.authToken.split(".")).toHaveLength(3);
        expect(decodeJwtPayload(payload.authToken).accessToken).toBe("frontend-only-mock-token");
    });

    it("normalizes /me token query into JWT", async () => {
        const middleware = getMockMiddleware();

        const response = await runMiddleware(middleware, "/me?token=plain-token", "GET");
        const payload = JSON.parse(response.body) as { authToken: string };

        expect(response.statusCode).toBe(200);
        expect(payload.authToken.split(".")).toHaveLength(3);
        expect(decodeJwtPayload(payload.authToken).accessToken).toBe("plain-token");
    });

    it("serves /mock-maps and favicon-related map assets path via middleware", async () => {
        const middleware = getMockMiddleware();
        const response = await runMiddleware(middleware, "/mock-maps/starter/map.json", "GET");

        expect(response.statusCode).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.body).toContain("\"height\"");
    });

    it("returns companion list from /companion/list", async () => {
        const middleware = getMockMiddleware();
        const response = await runMiddleware(
            middleware,
            "/companion/list?roomUrl=http%3A%2F%2Flocalhost%3A8080%2F_%2Fglobal%2Fmock-maps%2Fstarter%2Fmap.json",
            "GET"
        );

        const payload = JSON.parse(response.body) as Array<{ name: string; textures: Array<{ id: string }> }>;
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(payload)).toBe(true);
        expect(payload[0]?.name).toBe("default");
        expect(payload[0]?.textures.length).toBeGreaterThan(0);
    });

    it("returns 204 for save endpoints", async () => {
        const middleware = getMockMiddleware();

        const saveName = await runMiddleware(middleware, "/save-name", "POST");
        const saveTextures = await runMiddleware(middleware, "/save-textures", "POST");
        const saveCompanion = await runMiddleware(middleware, "/save-companion-texture", "POST");

        expect(saveName.statusCode).toBe(204);
        expect(saveTextures.statusCode).toBe(204);
        expect(saveCompanion.statusCode).toBe(204);
    });

    it("returns deterministic /register payload", async () => {
        const middleware = getMockMiddleware();
        const response = await runMiddleware(middleware, "/register", "POST");

        const payload = JSON.parse(response.body) as {
            roomUrl: string;
            mapUrlStart: string;
            userUuid: string;
            authToken: string;
        };

        expect(response.statusCode).toBe(200);
        expect(payload.roomUrl).toBe("/_/global/mock-maps/starter/map.json");
        expect(payload.mapUrlStart).toBe("/mock-maps/starter/map.json");
        expect(payload.userUuid).toBe("frontend-only-user");
        expect(payload.authToken.split(".")).toHaveLength(3);
    });

    it("returns /ping health response", async () => {
        const middleware = getMockMiddleware();
        const response = await runMiddleware(middleware, "/ping", "GET");

        expect(response.statusCode).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/plain");
        expect(response.body).toBe("pong");
    });
});
