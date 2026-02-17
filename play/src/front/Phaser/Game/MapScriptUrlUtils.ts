export function resolveMapScriptUrls(
    script: string | undefined,
    mapUrlFile: string,
    pageUrl?: string
): string[] {
    if (!script) {
        return [];
    }

    const basePageUrl = pageUrl ?? (typeof window !== "undefined" ? window.location.href : "http://localhost/");
    const absoluteMapUrl = new URL(mapUrlFile, basePageUrl).toString();

    return script
        .split("\n")
        .map((scriptSplit) => scriptSplit.trim())
        .filter((scriptSplit) => scriptSplit.length > 0)
        .flatMap((scriptSplit) => {
            try {
                return [new URL(scriptSplit, absoluteMapUrl).toString()];
            } catch (error) {
                console.warn(`Skipping invalid map script URL "${scriptSplit}"`, error);
                return [];
            }
        });
}
