import * as AWS from 'aws-sdk';
import { HierarchyItem } from './models';

export class HierarchyRepository {
    private readonly documentClient: AWS.DynamoDB.DocumentClient;
    private readonly tableName: string;

    constructor(documentClient: AWS.DynamoDB.DocumentClient, tableName: string) {
        this.documentClient = documentClient;
        this.tableName = tableName;
    }

    public async saveHierarchyItem(item: HierarchyItem): Promise<void> {
        await this.documentClient.put({
            TableName: this.tableName,
            Item: {
                ...item,
            },
        }).promise();

        if (!item.parentId) {
            return;
        }

        // get all the ancestors of the parent
        const ancestors = await this.listAllAncestors(item.parentId);

        // each ancestor has a new descendant of the new item, with a relative depth one greater than that of the parent
        for (const ancestor of ancestors) {
            await this.saveHierarchyItemAsChild(item, ancestor.ancestorId, ancestor.relativeDepth + 1);
        }
    }

    public async getHierarchyItem(id: string): Promise<HierarchyItem | undefined> {
        const result = await this.documentClient.get({
            TableName: this.tableName,
            Key: {
                id,
                relativeDepth: 0,
            }
        }).promise();

        return result.Item ? result.Item as HierarchyItem : undefined;
    }

    public async deleteHierarchyItem(id: string): Promise<void> {
        const ancestors = await this.queryAll({
            TableName: this.tableName,
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':id': id,
            },
            ProjectionExpression: 'id,relativeDepth'
        });
        for (const ancestor of ancestors) {
            await this.documentClient.delete({
                TableName: this.tableName,
                Key: ancestor
            }).promise();
        }
    }

    public async updateParent(id: string, newParentId: string): Promise<void> {
        const ancestors = await this.queryAll({
            TableName: this.tableName,
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':id': id,
            },
            ProjectionExpression: 'id,relativeDepth'
        });
        for (const ancestor of ancestors) {
            await this.documentClient.update({
                TableName: this.tableName,
                Key: ancestor,
                UpdateExpression: 'SET #parentId = :parentId',
                ExpressionAttributeNames: {
                    '#parentId': 'parentId'
                },
                ExpressionAttributeValues: {
                    ':parentId': newParentId
                }
            }).promise();
        }

        // get all the descendants of the moved item. these will need to have new records added to all the new ancestors
        const descendants = await this.listAllDescendants(id);
        // get all the new parent's ancestors. these will need a new descendant of all the descendants of the moved item.
        const newParentAncestors = await this.listAllAncestors(newParentId);

        for (const descendant of descendants) {
            // delete everything above
            const ancestorsToDelete = await this.listAllAncestors(descendant.id, descendant.relativeDepth + 1);

            for (const ancestor of ancestorsToDelete) {
                await this.documentClient.delete({
                    TableName: this.tableName,
                    Key: {
                        id: ancestor.id,
                        relativeDepth: ancestor.relativeDepth
                    }
                }).promise();
            }

            // add the descendant to each of the new parent's ancestors (this should include the new parent as well, with a depth of 0)
            for (const ancestor of newParentAncestors) {
                // the new depth should be the depth of the descendant (depth from the moved item to the descendant) plus the depth of the ancestor (depth from the ancestor to the moved item) plus 1
                const relativeDepth = ancestor.relativeDepth + descendant.relativeDepth + 1;
                await this.saveHierarchyItemAsChild(descendant, ancestor.ancestorId, relativeDepth);
            }
        }
    }

    public async updateName(id: string, name: string): Promise<void> {
        const ancestors = await this.queryAll({
            TableName: this.tableName,
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':id': id,
            },
            ProjectionExpression: 'id,relativeDepth'
        });
        for (const ancestor of ancestors) {
            await this.documentClient.update({
                TableName: this.tableName,
                Key: ancestor,
                UpdateExpression: 'SET #name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': name
                }
            }).promise();
        }
    }

    public async listDirectChildren(id: string): Promise<HierarchyItem[]> {
        const items = await this.queryAll({
            TableName: this.tableName,
            IndexName: 'gsi1',
            KeyConditionExpression: '#ancestorId = :id AND #relativeDepth = :one',
            ExpressionAttributeNames: {
                '#ancestorId': 'ancestorId',
                '#relativeDepth': 'relativeDepth'
            },
            ExpressionAttributeValues: {
                ':id': id,
                ':one': 1
            }
        });

        return items.sort(sortItems);
    }

    public async listAllDescendants(id: string, minRelativeDepth = 0, maxRelativeDepth = Number.MAX_SAFE_INTEGER): Promise<HierarchyItem[]> {
        const items = await this.queryAll({
            TableName: this.tableName,
            IndexName: 'gsi1',
            KeyConditionExpression: '#ancestorId = :id and #relativeDepth BETWEEN :start AND :end',
            ExpressionAttributeNames: {
                '#ancestorId': 'ancestorId',
                '#relativeDepth': 'relativeDepth',
            },
            ExpressionAttributeValues: {
                ':id': id,
                ':start': minRelativeDepth,
                ':end': maxRelativeDepth
            }
        });

        return items.sort(sortItems);
    }

    public async listAllAncestors(id: string, minRelativeDepth = 0, maxRelativeDepth = Number.MAX_SAFE_INTEGER): Promise<HierarchyItem[]> {
        const items = await this.queryAll({
            TableName: this.tableName,
            KeyConditionExpression: '#id = :id and #relativeDepth BETWEEN :start AND :end',
            ExpressionAttributeNames: {
                '#id': 'id',
                '#relativeDepth': 'relativeDepth',
            },
            ExpressionAttributeValues: {
                ':id': id,
                ':start': minRelativeDepth,
                ':end': maxRelativeDepth
            }
        });

        return items.sort(sortItems);
    }

    private async saveHierarchyItemAsChild(item: HierarchyItem, ancestorId: string, relativeDepth: number): Promise<void> {
        await this.documentClient.put({
            TableName: this.tableName,
            Item: {
                ...item,
                relativeDepth,
                ancestorId
            },
        }).promise();
    }

    private async queryAll(query: AWS.DynamoDB.DocumentClient.QueryInput): Promise<any[]> {
        query.Limit = undefined;
        query.ExclusiveStartKey = undefined;

        let items: any[] = [];
        do {
            const result = await this.documentClient.query(query).promise();
            if (result.Items) {
                items = items.concat(result.Items as any[]);
            }

            query.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (!!query.ExclusiveStartKey);

        return items;
    }
}

function sortItems(a: HierarchyItem, b: HierarchyItem) {
    const relativeDepth = a.relativeDepth - b.relativeDepth;
    if (relativeDepth !== 0) {
        return relativeDepth;
    }

    return a.name === b.name ? 0 : a.name > b.name ? 1 : -1;
}
