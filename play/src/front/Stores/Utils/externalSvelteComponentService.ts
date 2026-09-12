import type { Component, ComponentProps } from "svelte";
import { writable } from "svelte/store";
import type { ExternalSvelteComponentServiceInterface } from "../../ExternalModule/ExtensionModule";

const externalComponentsByZone = {
    actionBarAppsMenu: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    availabilityStatus: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    popup: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    // Components displayed at the top of the menu when the menu is open
    menuTop: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    chatBand: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    centeredPopup: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    calendarImage: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    todoListImage: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    calendarButton: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
    todoListButton: writable(
        new Map<
            string,
            { componentType: Component<Record<string, any>>; props?: Record<string, any> }
        >()
    ),
};

export type ExternalComponentZones = keyof typeof externalComponentsByZone;

class ExternalSvelteComponentService implements ExternalSvelteComponentServiceInterface {
    public getComponentsByZone(zone: ExternalComponentZones) {
        return externalComponentsByZone[zone];
    }

    public addComponentToZone<T extends Component<any>>(
        zone: ExternalComponentZones,
        key: string,
        componentType: T,
        props?: ComponentProps<T>
    ) {
        externalComponentsByZone[zone].update((map) => {
            map.set(key, { componentType, props });
            return map;
        });
    }

    public removeComponentFromZone(zone: ExternalComponentZones, key: string): void {
        externalComponentsByZone[zone].update((map) => {
            map.delete(key);
            return map;
        });
    }
}

export const externalSvelteComponentService = new ExternalSvelteComponentService();
