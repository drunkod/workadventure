import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const composePath = "deploy/local-first/compose.yml";
const envPath = "deploy/local-first/.env.example";
const snapshotTimestamp = "20260418T120000Z";

const snapshotBlock = [
    "RUN printf '%s\\n' \\",
    `    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/${snapshotTimestamp} bullseye main' \\`,
    `    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/${snapshotTimestamp} bullseye-updates main' \\`,
    `    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/${snapshotTimestamp} bullseye-security main' \\`,
    "    > /etc/apt/sources.list",
    "",
].join("\n");

function deriveCompatibilityDockerfile(source, { disableSourceMaps = false } = {}) {
    let derived = source.replace(
        /^RUN apt-get update && apt-get install -y/gm,
        `${snapshotBlock}RUN apt-get update && apt-get install -y`
    );
    if (disableSourceMaps) {
        derived = derived.replace(
            "RUN --mount=type=secret,id=SENTRY_RELEASE \\\n",
            "ENV GENERATE_SOURCEMAP=false\nRUN --mount=type=secret,id=SENTRY_RELEASE \\\n"
        );
    }
    return derived;
}

function fail(message) {
    console.error(`[local-first verify] ${message}`);
    process.exitCode = 1;
}

const compatibilityRecipes = {
    play: ["play/Dockerfile", "deploy/local-first/images/play.Dockerfile", { disableSourceMaps: true }],
    back: ["back/Dockerfile", "deploy/local-first/images/back.Dockerfile", {}],
    "map-storage": ["map-storage/Dockerfile", "deploy/local-first/images/map-storage.Dockerfile", {}],
    uploader: ["uploader/Dockerfile", "deploy/local-first/images/uploader.Dockerfile", {}],
};

for (const [name, [upstreamPath, compatPath, transformOptions]] of Object.entries(compatibilityRecipes)) {
    const upstream = readFileSync(path.join(repoRoot, upstreamPath), "utf8");
    const actual = readFileSync(path.join(repoRoot, compatPath), "utf8");
    const expected = deriveCompatibilityDockerfile(upstream, transformOptions);
    if (actual !== expected) {
        fail(`${name} compatibility Dockerfile drifted beyond the approved Snapshot injection`);
    }
}

const result = spawnSync(
    "docker-compose",
    ["--env-file", envPath, "-f", composePath, "config", "--format", "json"],
    { cwd: repoRoot, encoding: "utf8" }
);

if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "docker-compose config failed\n");
    process.exit(result.status ?? 1);
}

const config = JSON.parse(result.stdout);
const services = config.services ?? {};
const serviceNames = Object.keys(services).sort();
const expectedServices = ["back", "icon", "map-storage", "maps", "play", "redis", "reverse-proxy", "uploader"];

if (JSON.stringify(serviceNames) !== JSON.stringify(expectedServices)) {
    fail(`service set mismatch: ${serviceNames.join(", ")}`);
}

for (const name of serviceNames) {
    if (/(synapse|matrix|oidc|redisinsight|messages|everything_started)/i.test(name)) {
        fail(`forbidden service present: ${name}`);
    }
    const ports = services[name].ports ?? [];
    if (name === "reverse-proxy") {
        if (ports.length !== 1) fail("reverse-proxy must publish exactly one port");
        const port = ports[0] ?? {};
        const hostIp = port.host_ip ?? port.HostIp;
        const published = String(port.published ?? port.PublishedPort ?? "");
        const target = Number(port.target ?? port.TargetPort);
        if (hostIp !== "127.0.0.1" || published !== "80" || target !== 80) {
            fail(`reverse-proxy port must be 127.0.0.1:80:80, got ${JSON.stringify(port)}`);
        }
    } else if (ports.length !== 0) {
        fail(`${name} must not publish host ports`);
    }
}

const expectedBuilds = {
    play: {
        context: repoRoot,
        dockerfile: path.join(repoRoot, "deploy/local-first/images/play.Dockerfile"),
    },
    back: {
        context: repoRoot,
        dockerfile: path.join(repoRoot, "deploy/local-first/images/back.Dockerfile"),
    },
    "map-storage": {
        context: repoRoot,
        dockerfile: path.join(repoRoot, "deploy/local-first/images/map-storage.Dockerfile"),
    },
    uploader: {
        context: repoRoot,
        dockerfile: path.join(repoRoot, "deploy/local-first/images/uploader.Dockerfile"),
    },
    maps: {
        context: path.join(repoRoot, "maps"),
        dockerfile: path.join(repoRoot, "maps/Dockerfile"),
    },
};

for (const [name, expected] of Object.entries(expectedBuilds)) {
    const build = services[name]?.build;
    if (!build) {
        fail(`${name} must be source-built`);
        continue;
    }
    const actualContext = path.resolve(build.context);
    const actualDockerfile = path.resolve(
        path.isAbsolute(build.dockerfile ?? "")
            ? build.dockerfile
            : path.join(build.context, build.dockerfile ?? "Dockerfile")
    );
    if (actualContext !== path.resolve(expected.context)) {
        fail(`${name} build context mismatch: ${build.context}`);
    }
    if (actualDockerfile !== path.resolve(expected.dockerfile)) {
        fail(`${name} dockerfile mismatch: ${actualDockerfile}`);
    }
}

const playEnv = services.play?.environment ?? {};
const requiredEnv = {
    JAZZ_CHAT_ENABLED: "true",
    JAZZ_SYNC_MODE: "local",
    JAZZ_SYNC_PEER: "",
    JAZZ_API_KEY: "",
    JAZZ_GLOBAL_ROOM_ID: "",
    MATRIX_API_URI: "",
    MATRIX_PUBLIC_URI: "",
    MATRIX_ADMIN_USER: "",
    MATRIX_ADMIN_PASSWORD: "",
    MATRIX_DOMAIN: "",
    OPENID_CLIENT_ID: "",
    OPENID_CLIENT_SECRET: "",
    OPENID_CLIENT_ISSUER: "",
    JITSI_URL: "",
    BBB_URL: "",
    STUN_SERVER: "",
    TURN_SERVER: "",
};

for (const [key, expected] of Object.entries(requiredEnv)) {
    if (String(playEnv[key] ?? "") !== expected) fail(`play ${key} mismatch`);
}

function hasVolume(serviceName, target) {
    return (services[serviceName]?.volumes ?? []).some((volume) => {
        if (typeof volume === "string") return volume.endsWith(`:${target}`);
        return volume?.target === target && volume?.type === "volume";
    });
}

if (!hasVolume("redis", "/data")) fail("redis named volume /data missing");
if (!hasVolume("map-storage", "/maps")) fail("map-storage named volume /maps missing");

if (process.exitCode) process.exit(process.exitCode);
console.log(
    "[local-first verify] PASS: standalone topology, compatibility Dockerfile drift guard, loopback exposure, local Jazz policy, and durable volume mounts"
);
