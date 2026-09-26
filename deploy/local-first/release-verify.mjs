import { spawnSync } from "node:child_process";

const args = [
    "--env-file", "deploy/local-first/.env.example",
    "-f", "deploy/local-first/compose.yml",
    "-f", "deploy/local-first/release-isolation.yml",
    "config", "--format", "json",
];
const result = spawnSync("docker-compose", args, { encoding: "utf8" });
if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "docker-compose config failed\n");
    process.exit(result.status ?? 1);
}
const config = JSON.parse(result.stdout);
const fail = (message) => {
    console.error(`[local-first release verify] FAIL: ${message}`);
    process.exitCode = 1;
};
if (config.networks?.default?.internal !== true) fail("default network must be internal");
if (config.networks?.ingress?.driver !== "bridge") fail("ingress must use bridge driver");
if (String(config.networks?.ingress?.driver_opts?.["com.docker.network.bridge.enable_ip_masquerade"]) !== "false") {
    fail("ingress masquerade must be disabled");
}
for (const [name, service] of Object.entries(config.services ?? {})) {
    const networks = Object.keys(service.networks ?? {}).sort();
    if (name === "reverse-proxy") {
        if (networks.length !== 2 || networks[0] !== "default" || networks[1] !== "ingress") {
            fail("reverse-proxy must join exactly default and ingress");
        }
    } else if (networks.length !== 1 || networks[0] !== "default") {
        fail(`${name} must join only the internal default network`);
    }
}
const env = config.services?.play?.environment ?? {};
if (String(env.JAZZ_SYNC_MODE) !== "local") fail("JAZZ_SYNC_MODE must remain local");
if (!String(env.JAZZ_SYNC_PEER ?? "").includes("stale-jazz-peer.invalid")) fail("stale Jazz peer control missing");
if (String(env.JAZZ_API_KEY ?? "") !== "stale-local-first-release-key") fail("stale Jazz API key control missing");
if (!process.exitCode) console.log("[local-first release verify] PASS");
