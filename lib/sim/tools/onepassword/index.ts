import { createItemTool } from '@/lib/sim/tools/onepassword/create_item'
import { deleteItemTool } from '@/lib/sim/tools/onepassword/delete_item'
import { getItemTool } from '@/lib/sim/tools/onepassword/get_item'
import { getVaultTool } from '@/lib/sim/tools/onepassword/get_vault'
import { listItemsTool } from '@/lib/sim/tools/onepassword/list_items'
import { listVaultsTool } from '@/lib/sim/tools/onepassword/list_vaults'
import { replaceItemTool } from '@/lib/sim/tools/onepassword/replace_item'
import { resolveSecretTool } from '@/lib/sim/tools/onepassword/resolve_secret'
import { updateItemTool } from '@/lib/sim/tools/onepassword/update_item'

export const onepasswordCreateItemTool = createItemTool
export const onepasswordDeleteItemTool = deleteItemTool
export const onepasswordGetItemTool = getItemTool
export const onepasswordGetVaultTool = getVaultTool
export const onepasswordListItemsTool = listItemsTool
export const onepasswordListVaultsTool = listVaultsTool
export const onepasswordReplaceItemTool = replaceItemTool
export const onepasswordResolveSecretTool = resolveSecretTool
export const onepasswordUpdateItemTool = updateItemTool
