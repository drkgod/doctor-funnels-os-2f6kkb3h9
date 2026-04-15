import { GenericPage } from '@/components/GenericPage'
import { ModuleGate } from '@/components/ModuleGate'

export default function Email() {
  return (
    <ModuleGate moduleKey="email">
      <GenericPage title="Email" subtitle="Campanhas e comunicações transacionais" />
    </ModuleGate>
  )
}
