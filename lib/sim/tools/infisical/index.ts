import { createSecretTool } from '@/lib/sim/tools/infisical/create_secret'
import { deleteSecretTool } from '@/lib/sim/tools/infisical/delete_secret'
import { getSecretTool } from '@/lib/sim/tools/infisical/get_secret'
import { listSecretsTool } from '@/lib/sim/tools/infisical/list_secrets'
import { updateSecretTool } from '@/lib/sim/tools/infisical/update_secret'

export const infisicalListSecretsTool = listSecretsTool
export const infisicalGetSecretTool = getSecretTool
export const infisicalCreateSecretTool = createSecretTool
export const infisicalUpdateSecretTool = updateSecretTool
export const infisicalDeleteSecretTool = deleteSecretTool

export * from './types'
