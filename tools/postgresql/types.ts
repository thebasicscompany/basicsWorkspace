export interface PostgresConnectionConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: 'disabled' | 'required' | 'preferred'
}
