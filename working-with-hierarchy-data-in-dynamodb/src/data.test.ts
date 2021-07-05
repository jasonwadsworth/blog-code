import AWS from 'aws-sdk';
import { HierarchyRepository } from './data';

jest.setTimeout(300000);

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${process.env.__DynamoDBTestHelper_Port__}`),
});

const repository = new HierarchyRepository(documentClient, process.env.__TABLE_NAME__);
export const a = { id: 'A', ancestorId: 'A', name: 'Item A', relativeDepth: 0, };
export const b = { id: 'B', ancestorId: 'B', name: 'Item B', relativeDepth: 0, parentId: 'A' };
export const d = { id: 'D', ancestorId: 'D', name: 'Item D', relativeDepth: 0, parentId: 'B' };
export const g = { id: 'G', ancestorId: 'G', name: 'Item G', relativeDepth: 0, parentId: 'D' };
export const i = { id: 'I', ancestorId: 'I', name: 'Item I', relativeDepth: 0, parentId: 'G' };
export const e = { id: 'E', ancestorId: 'E', name: 'Item E', relativeDepth: 0, parentId: 'B' };
export const c = { id: 'C', ancestorId: 'C', name: 'Item C', relativeDepth: 0, parentId: 'A' };
export const f = { id: 'F', ancestorId: 'F', name: 'Item F', relativeDepth: 0, parentId: 'C' };
export const h = { id: 'H', ancestorId: 'H', name: 'Item H', relativeDepth: 0, parentId: 'F' };
// creates a hierarchy with this structure
// -A
//  |-B
//  | |-D
//  | | |-G
//  | |   |-I
//  | |-E
//  |-C
//    |-F
//      |-H

describe('data', () => {
    beforeEach(async () => {
        await deleteAll();
        await seedTestData();
    });

    it('should update the name in all the inherited records', async () => {
        await repository.updateName(i.id, 'Updated I');

        const aDescendants = await repository.listAllDescendants(a.id);
        const iFromA = aDescendants.find(d => d.id === i.id);
        expect(iFromA).toEqual({ ...i, name: 'Updated I', ancestorId: 'A', relativeDepth: 4 });

        const dDescendants = await repository.listAllDescendants(d.id);
        const iFromD = dDescendants.find(d => d.id === i.id);
        expect(iFromD).toEqual({ ...i, name: 'Updated I', ancestorId: 'D', relativeDepth: 2 });

        const updatedI = await repository.getHierarchyItem(i.id);
        expect(updatedI).toEqual({ ...i, name: 'Updated I' });
    });

    it('should update all the inherited records when the parent is changed - D to E', async () => {
        await repository.updateParent(d.id, e.id);

        const aDescendants = await repository.listAllDescendants(a.id);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...d, parentId: e.id, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
            { ...g, ancestorId: 'A', relativeDepth: 4 },
            { ...i, ancestorId: 'A', relativeDepth: 5 },
        ]);

        const bDescendants = await repository.listAllDescendants(b.id);

        expect(bDescendants).toEqual([
            { ...b, ancestorId: 'B', relativeDepth: 0 },
            { ...e, ancestorId: 'B', relativeDepth: 1 },
            { ...d, parentId: e.id, ancestorId: 'B', relativeDepth: 2 },
            { ...g, ancestorId: 'B', relativeDepth: 3 },
            { ...i, ancestorId: 'B', relativeDepth: 4 },
        ]);

        const dDescendants = await repository.listAllDescendants(d.id);

        expect(dDescendants).toEqual([
            { ...d, parentId: e.id, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
        ]);
    })

    it('should update all the inherited records when the parent is changed - I to A', async () => {
        await repository.updateParent(i.id, a.id);

        const aDescendants = await repository.listAllDescendants(a.id);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...i, parentId: a.id, ancestorId: 'A', relativeDepth: 1 },
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
        ]);

        const dDescendants = await repository.listAllDescendants(d.id);

        expect(dDescendants).toEqual([
            { ...d, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
        ]);
    })

    it('should update all the inherited records when the parent is changed - I to C', async () => {
        await repository.updateParent(i.id, c.id);

        const aDescendants = await repository.listAllDescendants(a.id);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...i, parentId: c.id, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
        ]);

        const dDescendants = await repository.listAllDescendants(d.id);

        expect(dDescendants).toEqual([
            { ...d, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
        ]);

        const cDescendants = await repository.listAllDescendants(c.id);

        expect(cDescendants).toEqual([
            { ...c, ancestorId: 'C', relativeDepth: 0 },
            { ...f, ancestorId: 'C', relativeDepth: 1 },
            { ...i, parentId: c.id, ancestorId: 'C', relativeDepth: 1 },
            { ...h, ancestorId: 'C', relativeDepth: 2 },
        ]);
    })

    it('should list all ancestors', async () => {
        const iAncestors = await repository.listAllAncestors(i.id);

        expect(iAncestors).toEqual([
            { ...i },
            { ...i, ancestorId: 'G', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
            { ...i, ancestorId: 'B', relativeDepth: 3 },
            { ...i, ancestorId: 'A', relativeDepth: 4 },
        ]);
    });

    it('should list all ancestors with a depth between 1 and 3', async () => {
        const iAncestors = await repository.listAllAncestors(i.id, 1, 3);

        expect(iAncestors).toEqual([
            { ...i, ancestorId: 'G', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
            { ...i, ancestorId: 'B', relativeDepth: 3 },
        ]);
    });

    it('should list all descendants - A', async () => {
        const aDescendants = await repository.listAllDescendants(a.id);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
            { ...i, ancestorId: 'A', relativeDepth: 4 },
        ]);
    });

    it('should list all descendants - A (depth 2 - 3)', async () => {
        const aDescendants = await repository.listAllDescendants(a.id, 2, 3);

        expect(aDescendants).toEqual([
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
        ]);
    });

    it('should list all descendants - D', async () => {
        const dDescendants = await repository.listAllDescendants(d.id);

        expect(dDescendants).toEqual([
            { ...d, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
        ]);
    });
});

export async function deleteAll() {
    let exclusiveStartKey: any = undefined;
    do {
        const result = await documentClient.scan({
            TableName: process.env.__TABLE_NAME__,
            ExclusiveStartKey: exclusiveStartKey,
            ProjectionExpression: 'id,relativeDepth'
        }).promise();
        if (result.Items) {
            for (const item of result.Items) {
                await documentClient.delete({
                    TableName: process.env.__TABLE_NAME__,
                    Key: item
                }).promise();
            }
        }

        exclusiveStartKey = result.LastEvaluatedKey;
    } while (!!exclusiveStartKey);
}

export async function seedTestData() {
    await repository.saveHierarchyItem(a);
    await repository.saveHierarchyItem(b);
    await repository.saveHierarchyItem(c);
    await repository.saveHierarchyItem(d);
    await repository.saveHierarchyItem(e);
    await repository.saveHierarchyItem(f);
    await repository.saveHierarchyItem(g);
    await repository.saveHierarchyItem(h);
    await repository.saveHierarchyItem(i);
}
