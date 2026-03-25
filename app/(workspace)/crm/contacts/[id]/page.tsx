import { RecordDetail } from "@/apps/crm/components/RecordDetail"

type Params = Promise<{ id: string }>

export default async function ContactDetailPage({ params }: { params: Params }) {
  const { id } = await params
  return <RecordDetail type="contacts" id={id} />
}
