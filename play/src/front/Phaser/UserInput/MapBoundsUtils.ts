type MapPixelBounds = {
    widthInPixels: number;
    heightInPixels: number;
};

type Point2D = {
    x: number;
    y: number;
};

export function isPointInsideMapBounds(point: Point2D, mapBounds: MapPixelBounds): boolean {
    return (
        point.x >= 0 && point.y >= 0 && point.x < mapBounds.widthInPixels && point.y < mapBounds.heightInPixels
    );
}
