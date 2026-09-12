import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const generatedDirectory = resolve(scriptDirectory, "../../libs/messages/src/ts-proto-generated");

for (const fileName of await readdir(generatedDirectory)) {
    if (!fileName.endsWith(".ts")) continue;

    const filePath = resolve(generatedDirectory, fileName);
    const source = await readFile(filePath, "utf8");
    if (!source.startsWith("//@ts-nocheck")) {
        await writeFile(filePath, `//@ts-nocheck\n${source}`);
    }
}
