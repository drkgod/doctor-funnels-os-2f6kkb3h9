import { GenericPage } from '@/components/GenericPage'
import { ModuleGate } from '@/components/ModuleGate'

export default function Reports() {
  return (
    <ModuleGate moduleKey="dashboard">
      <GenericPage title="Relatórios" subtitle="Análise de desempenho e conversão" />
    </ModuleGate>
  )
}
