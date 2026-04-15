import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  MessageCircle,
  Activity,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { ModuleGate } from '@/components/ModuleGate'
import { patientService } from '@/services/patientService'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PatientDialog } from '@/components/crm/PatientDialog'
import { useToast } from '@/hooks/use-toast'

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-500',
  contact: 'bg-blue-500',
  scheduled: 'bg-amber-500',
  consultation: 'bg-indigo-500',
  return: 'bg-purple-500',
  procedure: 'bg-emerald-500',
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const res = await patientService.fetchPatientById(id)
      setData(res)
    } catch (err: any) {
      if (err?.code === 'PGRST116') setError('Paciente não encontrado')
      else setError('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleDelete = async () => {
    try {
      await patientService.deletePatient(id!)
      toast({ title: 'Paciente excluído' })
      navigate('/crm')
    } catch (err) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  if (loading)
    return (
      <ModuleGate module_key="crm">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </ModuleGate>
    )
  if (error === 'Paciente não encontrado')
    return (
      <ModuleGate module_key="crm">
        <div className="p-20 text-center">
          <h2 className="text-xl font-semibold mb-4">Paciente não encontrado</h2>
          <Button onClick={() => navigate('/crm')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </ModuleGate>
    )
  if (error)
    return (
      <ModuleGate module_key="crm">
        <div className="p-20 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </ModuleGate>
    )

  const { patient, appointments, conversations, recentMessages } = data
  const age = patient.date_of_birth
    ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / 3.15576e10)
    : '—'

  const timeline = [
    {
      id: 'cre',
      date: patient.created_at,
      type: 'created',
      text: `Paciente cadastrado. Origem: ${patient.source}`,
      icon: Activity,
    },
    ...appointments.map((a: any) => ({
      id: a.id,
      date: a.datetime_start,
      type: 'appointment',
      text: `Agendamento: ${a.type} em ${format(new Date(a.datetime_start), 'dd/MM/yyyy', { locale: ptBR })}`,
      icon: Calendar,
    })),
    ...recentMessages.map((m: any) => ({
      id: m.id,
      date: m.created_at,
      type: 'message',
      text: `Mensagem: ${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}`,
      icon: MessageCircle,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <ModuleGate module_key="crm">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/crm')}
          className="text-muted-foreground -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao CRM
        </Button>

        <div className="bg-card rounded-xl border p-6 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{patient.full_name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge
                className={`${STAGE_COLORS[patient.pipeline_stage] || 'bg-primary'} text-white border-none`}
              >
                {patient.pipeline_stage.toUpperCase()}
              </Badge>
              <Badge variant="secondary">{patient.source}</Badge>
              {patient.assigned && (
                <span className="text-sm text-muted-foreground ml-2">
                  Resp: {patient.assigned.full_name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Telefone
                </span>
                <a
                  href={`tel:${patient.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  {patient.phone || '—'}
                </a>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Email
                </span>
                <a
                  href={`mailto:${patient.email}`}
                  className="font-medium text-primary hover:underline"
                >
                  {patient.email || '—'}
                </a>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">CPF</span>
                <span className="font-medium">{patient.cpf || '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Idade
                </span>
                <span className="font-medium">{age}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {patient.full_name}? Esta ação pode ser desfeita
                    posteriormente pelo administrador.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0">
            <TabsTrigger
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Agendamentos
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Conversas
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Detalhes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="pt-6">
            {timeline.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma atividade registrada.
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
                {timeline.map((ev, i) => (
                  <div
                    key={`${ev.id}-${i}`}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ev.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded border shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-sm text-foreground">
                          {ev.type.toUpperCase()}
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {format(new Date(ev.date), 'dd/MM/yyyy HH:mm')}
                        </time>
                      </div>
                      <div className="text-sm text-muted-foreground">{ev.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="pt-6">
            {appointments.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">Nenhum agendamento.</p>
                <Button onClick={() => navigate(`/agenda?patient_id=${patient.id}`)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar consulta
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {appointments.map((a: any) => (
                  <div
                    key={a.id}
                    className="bg-card p-4 rounded-lg border flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-3 rounded-lg text-center min-w-[70px]">
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(new Date(a.datetime_start), 'MMM', { locale: ptBR })}
                        </div>
                        <div className="text-xl font-bold">
                          {format(new Date(a.datetime_start), 'dd')}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{a.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(a.datetime_start), 'HH:mm')} -{' '}
                          {a.profiles?.full_name || 'Sem doutor'}
                        </div>
                      </div>
                    </div>
                    <Badge>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations" className="pt-6">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma conversa registrada.
              </div>
            ) : (
              <div className="grid gap-4">
                {conversations.map((c: any) => (
                  <div
                    key={c.id}
                    className="bg-card p-4 rounded-lg border flex justify-between items-center cursor-pointer hover:bg-secondary/50"
                    onClick={() => navigate(`/whatsapp?chat=${c.id}`)}
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> Conversa via WhatsApp
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Última msg:{' '}
                        {c.last_message_at
                          ? format(new Date(c.last_message_at), "dd/MM 'às' HH:mm")
                          : '—'}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="pt-6">
            <div className="bg-card border rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Nome</div>
                <div className="font-medium">{patient.full_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Gênero</div>
                <div className="font-medium capitalize">{patient.gender || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground uppercase mb-1">Endereço</div>
                <div className="font-medium">{patient.address || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground uppercase mb-1">Tags</div>
                <div className="flex gap-2 mt-1">
                  {patient.tags?.length
                    ? patient.tags.map((t: string) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))
                    : '—'}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground uppercase mb-1">Observações</div>
                <div className="bg-secondary/30 p-3 rounded text-sm">{patient.notes || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Cadastrado em</div>
                <div className="text-sm">
                  {format(new Date(patient.created_at), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  Última atualização
                </div>
                <div className="text-sm">
                  {format(new Date(patient.updated_at), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        {tenant && (
          <PatientDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            tenantId={tenant.id}
            patient={patient}
            onSuccess={loadData}
          />
        )}
      </div>
    </ModuleGate>
  )
}
