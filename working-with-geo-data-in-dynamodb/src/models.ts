export interface BoundingBox {
    minLatitude: number;
    minLongitude: number;
    maxLatitude: number;
    maxLongitude: number;
}

export interface Location {
    id: string;
    name: string;
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
}

export interface DBItem {
    pk: string;
    sk: string;
    gsi1pk?: string;
    gsi1sk?: string;
}

export interface DBLocation extends DBItem, Location {
}
