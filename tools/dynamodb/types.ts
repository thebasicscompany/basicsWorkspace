export interface DynamoDBConnectionConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export interface DynamoDBKeySchema {
  attributeName: string
  keyType: 'HASH' | 'RANGE'
}

export interface DynamoDBAttributeDefinition {
  attributeName: string
  attributeType: 'S' | 'N' | 'B'
}

export interface DynamoDBGSI {
  indexName: string
  keySchema: DynamoDBKeySchema[]
  projectionType: string
  indexStatus: string
}

export interface DynamoDBTableSchema {
  tableName: string
  tableStatus: string
  keySchema: DynamoDBKeySchema[]
  attributeDefinitions: DynamoDBAttributeDefinition[]
  globalSecondaryIndexes: DynamoDBGSI[]
  localSecondaryIndexes: DynamoDBGSI[]
  itemCount: number
  tableSizeBytes: number
  billingMode: string
}
