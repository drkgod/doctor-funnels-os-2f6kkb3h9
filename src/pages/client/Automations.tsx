import { GenericPage } from '@/components/GenericPage'
import { ModuleGate } from '@/components/ModuleGate'

export default function Automations() {
  return (
    <ModuleGate moduleKey="automations">
      <GenericPage title="Automações" subtitle="Fluxos de trabalho e réguas de relacionamento" />
    </ModuleGate>
  )
}
