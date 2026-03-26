// Deployment tools

// Domain tools
import { vercelAddDomainTool } from '@/lib/sim/tools/vercel/add_domain'
// Project tools
import { vercelAddProjectDomainTool } from '@/lib/sim/tools/vercel/add_project_domain'
import { vercelCancelDeploymentTool } from '@/lib/sim/tools/vercel/cancel_deployment'
// Alias tools
import { vercelCreateAliasTool } from '@/lib/sim/tools/vercel/create_alias'
// Check tools
import { vercelCreateCheckTool } from '@/lib/sim/tools/vercel/create_check'
import { vercelCreateDeploymentTool } from '@/lib/sim/tools/vercel/create_deployment'
// DNS tools
import { vercelCreateDnsRecordTool } from '@/lib/sim/tools/vercel/create_dns_record'
// Edge Config tools
import { vercelCreateEdgeConfigTool } from '@/lib/sim/tools/vercel/create_edge_config'
// Environment variable tools
import { vercelCreateEnvVarTool } from '@/lib/sim/tools/vercel/create_env_var'
import { vercelCreateProjectTool } from '@/lib/sim/tools/vercel/create_project'
// Webhook tools
import { vercelCreateWebhookTool } from '@/lib/sim/tools/vercel/create_webhook'
import { vercelDeleteAliasTool } from '@/lib/sim/tools/vercel/delete_alias'
import { vercelDeleteDeploymentTool } from '@/lib/sim/tools/vercel/delete_deployment'
import { vercelDeleteDnsRecordTool } from '@/lib/sim/tools/vercel/delete_dns_record'
import { vercelDeleteDomainTool } from '@/lib/sim/tools/vercel/delete_domain'
import { vercelDeleteEnvVarTool } from '@/lib/sim/tools/vercel/delete_env_var'
import { vercelDeleteProjectTool } from '@/lib/sim/tools/vercel/delete_project'
import { vercelDeleteWebhookTool } from '@/lib/sim/tools/vercel/delete_webhook'
import { vercelGetAliasTool } from '@/lib/sim/tools/vercel/get_alias'
import { vercelGetCheckTool } from '@/lib/sim/tools/vercel/get_check'
import { vercelGetDeploymentTool } from '@/lib/sim/tools/vercel/get_deployment'
import { vercelGetDeploymentEventsTool } from '@/lib/sim/tools/vercel/get_deployment_events'
import { vercelGetDomainTool } from '@/lib/sim/tools/vercel/get_domain'
import { vercelGetDomainConfigTool } from '@/lib/sim/tools/vercel/get_domain_config'
import { vercelGetEdgeConfigTool } from '@/lib/sim/tools/vercel/get_edge_config'
import { vercelGetEdgeConfigItemsTool } from '@/lib/sim/tools/vercel/get_edge_config_items'
import { vercelGetEnvVarsTool } from '@/lib/sim/tools/vercel/get_env_vars'
import { vercelGetProjectTool } from '@/lib/sim/tools/vercel/get_project'
// Team & User tools
import { vercelGetTeamTool } from '@/lib/sim/tools/vercel/get_team'
import { vercelGetUserTool } from '@/lib/sim/tools/vercel/get_user'
import { vercelListAliasesTool } from '@/lib/sim/tools/vercel/list_aliases'
import { vercelListChecksTool } from '@/lib/sim/tools/vercel/list_checks'
import { vercelListDeploymentFilesTool } from '@/lib/sim/tools/vercel/list_deployment_files'
import { vercelListDeploymentsTool } from '@/lib/sim/tools/vercel/list_deployments'
import { vercelListDnsRecordsTool } from '@/lib/sim/tools/vercel/list_dns_records'
import { vercelListDomainsTool } from '@/lib/sim/tools/vercel/list_domains'
import { vercelListEdgeConfigsTool } from '@/lib/sim/tools/vercel/list_edge_configs'
import { vercelListProjectDomainsTool } from '@/lib/sim/tools/vercel/list_project_domains'
import { vercelListProjectsTool } from '@/lib/sim/tools/vercel/list_projects'
import { vercelListTeamMembersTool } from '@/lib/sim/tools/vercel/list_team_members'
import { vercelListTeamsTool } from '@/lib/sim/tools/vercel/list_teams'
import { vercelListWebhooksTool } from '@/lib/sim/tools/vercel/list_webhooks'
import { vercelPauseProjectTool } from '@/lib/sim/tools/vercel/pause_project'
import { vercelRemoveProjectDomainTool } from '@/lib/sim/tools/vercel/remove_project_domain'
import { vercelRerequestCheckTool } from '@/lib/sim/tools/vercel/rerequest_check'
import { vercelUnpauseProjectTool } from '@/lib/sim/tools/vercel/unpause_project'
import { vercelUpdateCheckTool } from '@/lib/sim/tools/vercel/update_check'
import { vercelUpdateEdgeConfigItemsTool } from '@/lib/sim/tools/vercel/update_edge_config_items'
import { vercelUpdateEnvVarTool } from '@/lib/sim/tools/vercel/update_env_var'
import { vercelUpdateProjectTool } from '@/lib/sim/tools/vercel/update_project'

export {
  // Deployments
  vercelListDeploymentsTool,
  vercelGetDeploymentTool,
  vercelCreateDeploymentTool,
  vercelCancelDeploymentTool,
  vercelDeleteDeploymentTool,
  vercelGetDeploymentEventsTool,
  vercelListDeploymentFilesTool,
  // Projects
  vercelListProjectsTool,
  vercelGetProjectTool,
  vercelCreateProjectTool,
  vercelUpdateProjectTool,
  vercelDeleteProjectTool,
  vercelPauseProjectTool,
  vercelUnpauseProjectTool,
  vercelListProjectDomainsTool,
  vercelAddProjectDomainTool,
  vercelRemoveProjectDomainTool,
  // Environment Variables
  vercelGetEnvVarsTool,
  vercelCreateEnvVarTool,
  vercelUpdateEnvVarTool,
  vercelDeleteEnvVarTool,
  // Domains
  vercelListDomainsTool,
  vercelGetDomainTool,
  vercelAddDomainTool,
  vercelDeleteDomainTool,
  vercelGetDomainConfigTool,
  // DNS
  vercelListDnsRecordsTool,
  vercelCreateDnsRecordTool,
  vercelDeleteDnsRecordTool,
  // Aliases
  vercelListAliasesTool,
  vercelGetAliasTool,
  vercelCreateAliasTool,
  vercelDeleteAliasTool,
  // Edge Config
  vercelListEdgeConfigsTool,
  vercelGetEdgeConfigTool,
  vercelCreateEdgeConfigTool,
  vercelGetEdgeConfigItemsTool,
  vercelUpdateEdgeConfigItemsTool,
  // Teams & User
  vercelListTeamsTool,
  vercelGetTeamTool,
  vercelListTeamMembersTool,
  vercelGetUserTool,
  // Webhooks
  vercelListWebhooksTool,
  vercelCreateWebhookTool,
  vercelDeleteWebhookTool,
  // Checks
  vercelCreateCheckTool,
  vercelGetCheckTool,
  vercelListChecksTool,
  vercelUpdateCheckTool,
  vercelRerequestCheckTool,
}

export * from './types'
