import { RecordDetail } from "@/apps/crm/components/RecordDetail"

type Params = Promise<{ id: string }>

export default async function DealDetailPage({ params }: { params: Params }) {
  const { id } = await params
  return <RecordDetail type="deals" id={id} />
}
