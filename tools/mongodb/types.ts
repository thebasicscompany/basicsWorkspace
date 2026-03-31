export interface MongoDBConnectionConfig {
  host: string
  port: number
  database: string
  username?: string
  password?: string
  authSource?: string
  ssl?: 'disabled' | 'required' | 'preferred'
}

export interface MongoDBCollectionInfo {
  name: string
  type: string
  documentCount: number
  indexes: Array<{
    name: string
    key: Record<string, number>
    unique: boolean
    sparse?: boolean
  }>
}
