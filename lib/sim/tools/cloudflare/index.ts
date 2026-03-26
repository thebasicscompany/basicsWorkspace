import { createDnsRecordTool } from '@/lib/sim/tools/cloudflare/create_dns_record'
import { createZoneTool } from '@/lib/sim/tools/cloudflare/create_zone'
import { deleteDnsRecordTool } from '@/lib/sim/tools/cloudflare/delete_dns_record'
import { deleteZoneTool } from '@/lib/sim/tools/cloudflare/delete_zone'
import { dnsAnalyticsTool } from '@/lib/sim/tools/cloudflare/dns_analytics'
import { getZoneTool } from '@/lib/sim/tools/cloudflare/get_zone'
import { getZoneSettingsTool } from '@/lib/sim/tools/cloudflare/get_zone_settings'
import { listCertificatesTool } from '@/lib/sim/tools/cloudflare/list_certificates'
import { listDnsRecordsTool } from '@/lib/sim/tools/cloudflare/list_dns_records'
import { listZonesTool } from '@/lib/sim/tools/cloudflare/list_zones'
import { purgeCacheTool } from '@/lib/sim/tools/cloudflare/purge_cache'
import { updateDnsRecordTool } from '@/lib/sim/tools/cloudflare/update_dns_record'
import { updateZoneSettingTool } from '@/lib/sim/tools/cloudflare/update_zone_setting'

export const cloudflareCreateDnsRecordTool = createDnsRecordTool
export const cloudflareCreateZoneTool = createZoneTool
export const cloudflareDeleteDnsRecordTool = deleteDnsRecordTool
export const cloudflareDeleteZoneTool = deleteZoneTool
export const cloudflareDnsAnalyticsTool = dnsAnalyticsTool
export const cloudflareGetZoneTool = getZoneTool
export const cloudflareGetZoneSettingsTool = getZoneSettingsTool
export const cloudflareListCertificatesTool = listCertificatesTool
export const cloudflareListDnsRecordsTool = listDnsRecordsTool
export const cloudflareListZonesTool = listZonesTool
export const cloudflarePurgeCacheTool = purgeCacheTool
export const cloudflareUpdateDnsRecordTool = updateDnsRecordTool
export const cloudflareUpdateZoneSettingTool = updateZoneSettingTool
