import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { createRequire } from "module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const designSystemPackageJsonPath = require.resolve("@workadventure/design-system/package.json", { paths: [root] });
const designSystemStyleRoot = resolve(dirname(designSystemPackageJsonPath), "dist/style");

const mappings = [
    {
        from: resolve(root, "src/front/style/design-system-assets/img/underline.svg"),
        to: resolve(designSystemStyleRoot, "img/underline.svg"),
    },
    {
        from: resolve(root, "src/front/style/design-system-assets/img/hightlight.svg"),
        to: resolve(designSystemStyleRoot, "img/hightlight.svg"),
    },
    {
        from: resolve(root, "src/front/style/design-system-assets/img/stripe-blue.svg"),
        to: resolve(designSystemStyleRoot, "img/stripe-blue.svg"),
    },
    {
        from: resolve(root, "src/front/style/design-system-assets/img/stripe-white.svg"),
        to: resolve(designSystemStyleRoot, "img/stripe-white.svg"),
    },
    {
        from: resolve(root, "src/front/style/design-system-assets/img/arrow-down.svg"),
        to: resolve(designSystemStyleRoot, "img/arrow-down.svg"),
    },
    {
        from: resolve(root, "src/front/style/design-system-assets/img/pattern.png"),
        to: resolve(designSystemStyleRoot, "img/pattern.png"),
    },
    {
        from: resolve(root, "../libs/tailwind/fonts/Oswald.ttf"),
        to: resolve(designSystemStyleRoot, "fonts/Oswald.ttf"),
    },
];

for (const mapping of mappings) {
    if (!existsSync(mapping.from)) {
        throw new Error(`Missing source asset: ${mapping.from}`);
    }
    mkdirSync(dirname(mapping.to), { recursive: true });
    copyFileSync(mapping.from, mapping.to);
}
