import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

type Evidence = {
    httpExternalAttempts: string[];
    wsAttempts: string[];
    wsExternalAttempts: string[];
    consoleErrors: string[];
    pageErrors: string[];
    assertions: Record<string, boolean>;
};

const origin = process.env.LOCAL_FIRST_RELEASE_ORIGIN ?? "http://play.workadventure.localhost";
const originUrl = new URL(origin);
const browserControlUrl = "https://example.com/";
const browserWebSocketControlUrl = `ws://${originUrl.host}/__local_first_ws_control__`;
const evidencePath = process.env.LOCAL_FIRST_BROWSER_EVIDENCE;

function isLocal(url: string): boolean {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1";
}

function isAllowedWorkAdventureWebSocket(url: string): boolean {
    const parsed = new URL(url);
    return (
        (parsed.protocol === "ws:" || parsed.protocol === "wss:") &&
        parsed.host.toLowerCase() === originUrl.host.toLowerCase() &&
        parsed.pathname === "/ws/room"
    );
}

function writeEvidence(evidence: Evidence) {
    if (!evidencePath) return;
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
}

async function installIsolation(context: BrowserContext, evidence: Evidence) {
    await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (isLocal(url)) return route.continue();
        evidence.httpExternalAttempts.push(url);
        await route.abort("blockedbyclient");
    });
    await context.routeWebSocket(/.*/, async (ws) => {
        const url = ws.url();
        evidence.wsAttempts.push(url);
        if (url === browserWebSocketControlUrl) {
            await ws.close();
            return;
        }
        if (isAllowedWorkAdventureWebSocket(url)) {
            ws.connectToServer();
            return;
        }
        if (!isLocal(url)) evidence.wsExternalAttempts.push(url);
        await ws.close();
    });
}

async function enterStarterMap(page: Page, navigate = false) {
    if (navigate) await page.goto(origin);
    const microphoneButton = page.getByTestId("microphone-button");
    if (await microphoneButton.isVisible().catch(() => false)) return;

    const loginInput = page.getByTestId("loginSceneNameInput");
    const characterSubmit = page.locator("button.selectCharacterSceneFormSubmit");
    const saveButton = page.getByRole("button", { name: /Save|Сохранить/i });
    await expect(loginInput.or(characterSubmit).or(saveButton).or(microphoneButton)).toBeVisible({ timeout: 30_000 });
    if (await microphoneButton.isVisible().catch(() => false)) return;

    if (await loginInput.isVisible().catch(() => false)) {
        await loginInput.fill("Local First");
        await page.locator("button.loginSceneFormSubmit").click();
        await expect(characterSubmit.or(saveButton).or(microphoneButton)).toBeVisible({ timeout: 30_000 });
    }

    if (await characterSubmit.isVisible().catch(() => false)) {
        await characterSubmit.click();
        await expect(saveButton.or(microphoneButton)).toBeVisible({ timeout: 30_000 });
    }

    if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
    }

    await expect(microphoneButton).toBeVisible({ timeout: 120_000 });
}

async function openJazzMainRoom(page: Page) {
    if (!(await page.getByTestId("chat").isVisible().catch(() => false))) {
        await page.getByTestId("chat-action").locator("button").first().click();
    }
    await expect(page.getByTestId("chat")).toBeVisible();
    const room = page.getByTestId("Jazz chat");
    await expect(room).toBeVisible({ timeout: 30_000 });
    await room.click();
    await expect(page.getByTestId("roomTimeline")).toBeVisible();
}
test("single-device local-first release", async ({ browser }) => {
    test.setTimeout(180_000);
    const evidence: Evidence = {
        httpExternalAttempts: [], wsAttempts: [], wsExternalAttempts: [], consoleErrors: [], pageErrors: [], assertions: {},
    };
    const context = await browser.newContext({
        locale: "ru-RU",
        permissions: ["microphone", "camera", "notifications"],
        serviceWorkers: "block",
    });
    await installIsolation(context, evidence);
    const page = await context.newPage();
    page.on("console", (message) => {
        if (message.type() === "error") evidence.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.pageErrors.push(String(error)));

    await page.goto("about:blank");
    const blocked = await page.evaluate(async (url) => {
        try {
            await fetch(url, { signal: AbortSignal.timeout(5000) });
            return false;
        } catch {
            return true;
        }
    }, browserControlUrl);
    expect(blocked).toBeTruthy();
    expect(evidence.httpExternalAttempts).toContain(browserControlUrl);

    const webSocketControlBlocked = await page.evaluate(
        async (url) =>
            await new Promise<boolean>((resolve) => {
                const socket = new WebSocket(url);
                const timer = setTimeout(() => resolve(false), 5_000);
                const blocked = () => {
                    clearTimeout(timer);
                    resolve(true);
                };
                socket.addEventListener("error", blocked, { once: true });
                socket.addEventListener("close", blocked, { once: true });
                socket.addEventListener(
                    "open",
                    () => {
                        clearTimeout(timer);
                        socket.close();
                        resolve(false);
                    },
                    { once: true },
                );
            }),
        browserWebSocketControlUrl,
    );
    expect(webSocketControlBlocked).toBeTruthy();
    expect(evidence.wsAttempts).toContain(browserWebSocketControlUrl);
    Object.assign(evidence.assertions, {
        browserHttpControlIntercepted: true,
        browserWebSocketControlIntercepted: true,
        browserPublicEgressBlocked: true,
    });

    await enterStarterMap(page, true);
    Object.assign(evidence.assertions, { anonymousStarterFlow: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    await expect(page.getByRole("button", { name: "Продолжить" })).toBeVisible({ timeout: 30_000 });
    Object.assign(evidence.assertions, { ruRUPersistsAfterReload: true });
    await enterStarterMap(page);
    await openJazzMainRoom(page);
    const original = `local-first-${Date.now()}`;
    const edited = `${original}-edited`;
    const deleted = `${original}-deleted`;
    await page.getByTestId("messageInput").fill(original);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(original, { exact: true })).toBeVisible();

    const originalLi = page.locator('li[data-event-id]', { hasText: original }).last();
    await originalLi.hover();
    await originalLi.getByTestId("editMessageButton").click();
    await page.getByTestId("editMessageInput").fill(edited);
    await page.getByTestId("saveMessageEditionButton").click();
    await expect(page.getByText(edited, { exact: true })).toBeVisible();
    Object.assign(evidence.assertions, { jazzTextEdit: true });

    await page.getByTestId("messageInput").fill(deleted);
    await page.getByTestId("sendMessageButton").click();
    const deletedLi = page.locator('li[data-event-id]', { hasText: deleted }).last();
    await deletedLi.hover();
    await deletedLi.getByTestId("removeMessageButton").click();
    await expect(page.getByText(deleted, { exact: true })).not.toBeAttached();
    Object.assign(evidence.assertions, { jazzDelete: true });
    await page.getByTestId("addApplicationButton").click();
    await page.getByTestId("fileAttachmentButton").click();
    const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
        "base64",
    );
    await page.getByTestId("uploadChatCustomAsset").setInputFiles({
        name: "local-first.png", mimeType: "image/png", buffer: png,
    });
    await expect(page.locator('img[alt="local-first.png"]')).toBeVisible({ timeout: 30_000 });
    Object.assign(evidence.assertions, { jazzImage: true });

    await page.reload();
    await enterStarterMap(page);
    await openJazzMainRoom(page);
    await expect(page.getByText(edited, { exact: true })).toBeVisible();
    await expect(page.locator('img[alt="local-first.png"]')).toBeVisible();
    await expect(page.getByText(deleted, { exact: true })).not.toBeAttached();
    Object.assign(evidence.assertions, { jazzReloadPersistence: true });

    const unexpectedWebSockets = evidence.wsAttempts.filter(
        (url) => url !== browserWebSocketControlUrl && !isAllowedWorkAdventureWebSocket(url),
    );
    expect(
        unexpectedWebSockets,
        `unexpected WebSocket attempts: ${unexpectedWebSockets.join(", ")}`,
    ).toEqual([]);

    const forbidden = [...evidence.httpExternalAttempts, ...evidence.wsAttempts].filter((url) =>
        /jazz|matrix|stale-jazz-peer/i.test(url),
    );
    expect(forbidden, `provider fallback attempts: ${forbidden.join(", ")}`).toEqual([]);
    Object.assign(evidence.assertions, {
        onlyExpectedWorkAdventureWebSockets: true,
        noProviderFallback: true,
    });
    writeEvidence(evidence);
    await context.close();
});
