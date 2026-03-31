import {
  SlackIcon,
  GoogleIcon,
  GithubIcon,
  NotionIcon,
  HubspotIcon,
  LinearIcon,
  JiraIcon,
  SalesforceIcon,
  AirtableIcon,
  AsanaIcon,
  DropboxIcon,
  MicrosoftIcon,
  TrelloIcon,
  ShopifyIcon,
  ZoomIcon,
} from '@/apps/automations/components/icons'

export interface ProviderInfo {
  id: string
  name: string
  icon: React.FC<{ className?: string }>
  category: 'communication' | 'productivity' | 'crm' | 'dev' | 'storage' | 'commerce'
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'slack',      name: 'Slack',       icon: SlackIcon,      category: 'communication' },
  { id: 'google',     name: 'Google',      icon: GoogleIcon,     category: 'productivity' },
  { id: 'microsoft',  name: 'Microsoft',   icon: MicrosoftIcon,  category: 'productivity' },
  { id: 'notion',     name: 'Notion',      icon: NotionIcon,     category: 'productivity' },
  { id: 'airtable',   name: 'Airtable',    icon: AirtableIcon,   category: 'productivity' },
  { id: 'asana',      name: 'Asana',       icon: AsanaIcon,      category: 'productivity' },
  { id: 'trello',     name: 'Trello',      icon: TrelloIcon,     category: 'productivity' },
  { id: 'github',     name: 'GitHub',      icon: GithubIcon,     category: 'dev' },
  { id: 'linear',     name: 'Linear',      icon: LinearIcon,     category: 'dev' },
  { id: 'jira',       name: 'Jira',        icon: JiraIcon,       category: 'dev' },
  { id: 'hubspot',    name: 'HubSpot',     icon: HubspotIcon,    category: 'crm' },
  { id: 'salesforce', name: 'Salesforce',  icon: SalesforceIcon, category: 'crm' },
  { id: 'dropbox',    name: 'Dropbox',     icon: DropboxIcon,    category: 'storage' },
  { id: 'shopify',    name: 'Shopify',     icon: ShopifyIcon,    category: 'commerce' },
  { id: 'zoom',       name: 'Zoom',        icon: ZoomIcon,       category: 'communication' },
]

/** Map from provider id → ProviderInfo for quick lookups */
export const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.id, p]))
