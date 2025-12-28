/**
 * Local Room
 * 
 * A Room implementation for local-first operation without Pusher/Back.
 * Provides all the properties the game expects without network requests.
 */

export class LocalRoom {
    public readonly id: string;
    private readonly _mapUrl: string;
    private readonly _key: string;
    private readonly _search: URLSearchParams;

    constructor(mapUrl: string) {
        this._mapUrl = mapUrl;
        this.id = `local/${mapUrl}`;
        this._key = window.location.href;
        this._search = new URLSearchParams(window.location.search);
    }

    // Static factory to match Room interface
    public static async createRoom(mapUrl: string): Promise<LocalRoom> {
        console.log('[LocalRoom] Creating local room for:', mapUrl);
        return new LocalRoom(mapUrl);
    }

    // Core properties
    get mapUrl(): string { return this._mapUrl; }
    get wamUrl(): string | undefined { return undefined; }
    get key(): string { return this._key; }
    get href(): string { return window.location.href; }
    get search(): URLSearchParams { return this._search; }
    get mapStorageUrl(): URL | undefined { return undefined; }

    // Authentication - always false for local mode
    get authenticationMandatory(): boolean { return false; }
    get opidLogoutRedirectUrl(): string { return '/'; }
    get opidWokaNamePolicy(): undefined { return undefined; }
    get isLogged(): boolean { return false; }

    // Room info - defaults for local mode
    get group(): string | null { return null; }
    get roomName(): string | undefined { return 'Local Room'; }
    get expireOn(): Date | undefined { return undefined; }
    get metadata(): unknown { return {}; }

    // Features - disabled for local mode
    get canReport(): boolean { return false; }
    get contactPage(): string | undefined { return undefined; }
    get isChatEnabled(): boolean { return false; }
    get isMatrixChatEnabled(): boolean { return false; }
    get isChatUploadEnabled(): boolean { return false; }
    get isChatOnlineListEnabled(): boolean { return false; }
    get isChatDisconnectedListEnabled(): boolean { return false; }
    get isSayEnabled(): boolean { return true; }
    get isIssueReportEnabled(): boolean { return false; }

    // UI customization - use defaults
    get loadingLogo(): string | undefined { return undefined; }
    get loginSceneLogo(): string | undefined { return undefined; }
    get backgroundSceneImage(): string | undefined { return undefined; }
    get showPoweredBy(): boolean { return false; }
    get backgroundColor(): string | undefined { return '#1b2a41'; }
    get primaryColor(): string | undefined { return '#e94560'; }
    get errorSceneLogo(): string | undefined { return undefined; }
    get pricingUrl(): string | undefined { return undefined; }
    get legals(): undefined { return undefined; }

    // Woka customization icons - undefined means use defaults
    get iconClothes(): string | undefined { return undefined; }
    get iconAccessory(): string | undefined { return undefined; }
    get iconHat(): string | undefined { return undefined; }
    get iconHair(): string | undefined { return undefined; }
    get iconEyes(): string | undefined { return undefined; }
    get iconBody(): string | undefined { return undefined; }
    get iconTurn(): string | undefined { return undefined; }

    // Other
    get reportIssuesUrl(): string | undefined { return undefined; }
    get entityCollectionsUrls(): string[] | undefined { return undefined; }
    get modules(): string[] { return []; }

    // Methods
    isDisconnected(): boolean { return true; } // Local mode = single player
    isEqual(room: LocalRoom): boolean { return room.key === this.key; }
}

/**
 * Check if LOCAL_MODE_ENABLED is set
 */
export function isLocalModeEnabled(): boolean {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('localMode') === 'true') {
        return true;
    }

    // Check window.env
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (window as any).env;
    if (env?.LOCAL_MODE_ENABLED === true || env?.LOCAL_MODE_ENABLED === 'true') {
        return true;
    }

    return false;
}

/**
 * Get the default map URL for local mode
 */
export function getLocalModeMapUrl(): string {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const mapParam = urlParams.get('map');
    if (mapParam) {
        return mapParam;
    }

    // Default starter map
    return '/maps/starter/map.json';
}
