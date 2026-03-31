export interface Neo4jConnectionConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  encryption?: 'enabled' | 'disabled'
}

export interface Neo4jNodeSchema {
  label: string
  properties: Array<{ name: string; types: string[] }>
}

export interface Neo4jRelationshipSchema {
  type: string
  properties: Array<{ name: string; types: string[] }>
}
