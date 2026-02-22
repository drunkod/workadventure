import "phaser";
import "./front/style/index.scss";

import App from "./front/Components/App.svelte";
import { HtmlUtils } from "./front/WebRtc/HtmlUtils";
import { e2eHooks } from "./front/Utils/E2EHooks";
import { mount } from "svelte";

// Initialize E2E hooks
declare global {
    interface Window {
        e2eHooks: typeof e2eHooks;
    }
}
window.e2eHooks = e2eHooks;

const app = mount(App, {
    target: HtmlUtils.getElementByIdOrFail("app"),
});

export default app;
