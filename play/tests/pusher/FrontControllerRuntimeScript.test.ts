import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Mustache from "mustache";
import { describe, expect, it } from "vitest";

const template = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

function getRuntimeLoader(html: string): string {
    const match = html.match(
        /<script type="application\/json" id="wa-runtime-script">[\s\S]*?<\/script>\s*<script>([\s\S]*?)<\/script>/
    );
    expect(match).not.toBeNull();
    return match?.[1] ?? "";
}

function getRuntimePayload(html: string): string {
    const match = html.match(
        /<script type="application\/json" id="wa-runtime-script">\s*([\s\S]*?)\s*<\/script>/
    );
    expect(match).not.toBeNull();
    return match?.[1] ?? "";
}

describe("production runtime script template", () => {
    it("renders and executes a quote-bearing runtime payload without corrupting the loader", () => {
        const runtimeEnv = {
            DEBUG_MODE: false,
            FRONT_URL: "http://play.workadventure.localhost",
        };
        const payload = `window.env = ${JSON.stringify(runtimeEnv)};`;
        const rendered = Mustache.render(template, { script: payload });
        const loader = getRuntimeLoader(rendered);

        expect(getRuntimePayload(rendered)).toBe(payload);
        expect(() => new Function(loader)).not.toThrow();

        const runtimeWindow: { env?: typeof runtimeEnv } = {};
        const document = {
            getElementById: () => ({ textContent: payload }),
        };
        function RuntimeFunction(source: string) {
            return new Function("window", source).bind(undefined, runtimeWindow);
        }

        new Function("document", "Function", loader)(document, RuntimeFunction);
        expect(runtimeWindow.env).toEqual(runtimeEnv);
    });

    it("keeps the raw template placeholder as a no-op", () => {
        const loader = getRuntimeLoader(template);
        expect(() => new Function(loader)).not.toThrow();

        let invoked = false;
        const document = {
            getElementById: () => ({ textContent: "{{{ script }}}" }),
        };
        function ForbiddenFunction() {
            invoked = true;
            throw new Error("raw Mustache placeholder must not execute");
        }

        expect(() => new Function("document", "Function", loader)(document, ForbiddenFunction)).not.toThrow();
        expect(invoked).toBe(false);
    });
});
