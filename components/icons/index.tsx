/**
 * Icon stubs — placeholder components for service icons.
 * Replace with real SVG icons when available.
 */
function createIconStub(name: string) {
  const Icon = (props: any) => (
    <div
      style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, borderRadius: 3, background: '#e5e7eb', color: '#6b7280' }}
      {...props}
    >
      {name.replace('Icon', '').slice(0, 2)}
    </div>
  )
  Icon.displayName = name
  return Icon
}

export const AirtableIcon = createIconStub('AirtableIcon')
export const AshbyIcon = createIconStub('AshbyIcon')
export const AttioIcon = createIconStub('AttioIcon')
export const CalComIcon = createIconStub('CalComIcon')
export const CalendlyIcon = createIconStub('CalendlyIcon')
export const CirclebackIcon = createIconStub('CirclebackIcon')
export const ConfluenceIcon = createIconStub('ConfluenceIcon')
export const FathomIcon = createIconStub('FathomIcon')
export const FirefliesIcon = createIconStub('FirefliesIcon')
export const GithubIcon = createIconStub('GithubIcon')
export const GmailIcon = createIconStub('GmailIcon')
export const GoogleFormsIcon = createIconStub('GoogleFormsIcon')
export const GrainIcon = createIconStub('GrainIcon')
export const HubspotIcon = createIconStub('HubspotIcon')
export const JiraIcon = createIconStub('JiraIcon')
export const LemlistIcon = createIconStub('LemlistIcon')
export const LinearIcon = createIconStub('LinearIcon')
export const MailServerIcon = createIconStub('MailServerIcon')
export const MicrosoftTeamsIcon = createIconStub('MicrosoftTeamsIcon')
export const OutlookIcon = createIconStub('OutlookIcon')
export const RssIcon = createIconStub('RssIcon')
export const SlackIcon = createIconStub('SlackIcon')
export const StripeIcon = createIconStub('StripeIcon')
export const TelegramIcon = createIconStub('TelegramIcon')
export const TwilioIcon = createIconStub('TwilioIcon')
export const TypeformIcon = createIconStub('TypeformIcon')
export const WebflowIcon = createIconStub('WebflowIcon')
export const WebhookIcon = createIconStub('WebhookIcon')
export const WhatsAppIcon = createIconStub('WhatsAppIcon')
export const McpIcon = createIconStub('McpIcon')
export const CustomToolIcon = createIconStub('CustomToolIcon')
export const HttpIcon = createIconStub('HttpIcon')
export const WorkflowIcon = createIconStub('WorkflowIcon')
export const AgentIcon = createIconStub('AgentIcon')
