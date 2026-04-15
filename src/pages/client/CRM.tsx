import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, UserPlus, Users, Filter, RefreshCw } from 'lucide-react'
import { ModuleGate } from '@/components/ModuleGate'
import { useTenant } from '@/hooks/useTenant'
import { patientService, type Patient } from '@/services/patientService'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { PatientDialog } from '@/components/crm/PatientDialog'

export default function CRM() {
  const { tenant, loading: tenantLoading } = useTenant()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [patientsByStage, setPatientsByStage] = useState<Record<string, any[]>>({})
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('Todas as origens')
  const [isDialogOpen, setIsDialogOpen] = useState(searchParams.get('action') === 'new')

  const initialStage = searchParams.get('stage') || 'lead'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = async () => {
    if (!tenant) return
    try {
      setLoading(true)
      setError(null)
      if (debouncedSearch) {
        const res = await patientService.fetchPatients(tenant.id, {
          search: debouncedSearch,
          source: sourceFilter,
        })
        setSearchResults(res)
      } else {
        const grouped = await patientService.fetchPatientsByStage(tenant.id)
        if (sourceFilter !== 'Todas as origens') {
          Object.keys(grouped).forEach(
            (k) => (grouped[k] = grouped[k].filter((p) => p.source === sourceFilter)),
          )
        }
        setPatientsByStage(grouped)
      }
    } catch (err) {
      setError('Não foi possível carregar o CRM. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant, debouncedSearch, sourceFilter])

  const handleMoveOptimistic = (id: string, from: string, to: string) => {
    setPatientsByStage((prev) => {
      const p = prev[from].find((x) => x.id === id)
      if (!p) return prev
      return { ...prev, [from]: prev[from].filter((x) => x.id !== id), [to]: [p, ...prev[to]] }
    })
  }

  const hasPatients = Object.values(patientsByStage).some((arr) => arr.length > 0)

  return (
    <ModuleGate module_key="crm">
      <div className="flex flex-col h-full gap-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas as origens">Todas as origens</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Formulario">Formulário</SelectItem>
                <SelectItem value="Telefone">Telefone</SelectItem>
                <SelectItem value="Indicacao">Indicação</SelectItem>
                <SelectItem value="Doctoralia">Doctoralia</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {loading || tenantLoading ? (
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="w-[300px] h-[500px] rounded-xl" />
            <Skeleton className="w-[300px] h-[500px] rounded-xl" />
            <Skeleton className="w-[300px] h-[500px] rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : debouncedSearch ? (
          <div className="bg-card border rounded-xl overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum resultado encontrado.
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/crm/patients/${p.id}`)}
                    className="p-4 hover:bg-secondary/50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-primary">{p.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.phone || p.email || 'Sem contato'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{p.pipeline_stage}</Badge>
                      <Badge variant="secondary">{p.source}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !hasPatients && sourceFilter === 'Todas as origens' ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center bg-card border border-dashed rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum paciente cadastrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Adicione seu primeiro paciente para começar a usar o CRM.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar paciente
            </Button>
          </div>
        ) : (
          <KanbanBoard
            patientsByStage={patientsByStage}
            onMoveOptimistic={handleMoveOptimistic}
            onMoveRevert={(id, f, t) => handleMoveOptimistic(id, f, t)}
          />
        )}

        {tenant && (
          <PatientDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            tenantId={tenant.id}
            initialStage={initialStage}
            onSuccess={loadData}
          />
        )}
      </div>
    </ModuleGate>
  )
}
