export interface CreateHierarchyItem {
    parentId?: string;
    name: string;
}

export interface UpdateHierarchyItemName {
    name: string;
}

export interface UpdateHierarchyItemParent {
    parentId: string;
}

export interface HierarchyItem {
    id: string;
    parentId?: string;
    name: string;
    relativeDepth: number;
    ancestorId: string;
}

export class StatusCodeError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}
