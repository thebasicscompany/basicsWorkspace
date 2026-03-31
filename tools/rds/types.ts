export interface RdsConnectionConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
  resourceArn: string
  secretArn: string
  database?: string
}
