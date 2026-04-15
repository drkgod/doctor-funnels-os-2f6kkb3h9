import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, MoreHorizontal, Send, Edit, Trash2, Loader2 } from 'lucide-react'
import { emailService, EmailCampaign } from '@/services/emailService'
import { toast } from 'sonner'
import { CampaignDialog } from './CampaignDialog'

interface Props {
  tenantId: string
  loading: boolean
  error: string | null
  onUsageUpdate: () => void
}

export function CampaignsTab({
  tenantId,
  loading: initLoading,
  error: initError,
  onUsageUpdate,
}: Props) {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | undefined>()
  const [sendingId, setSendingId] = useState<string | null>(null)

  const loadData = async () => {
    if (!tenantId) return
    try {
      setLoading(true)
      const data = await emailService.fetchCampaigns(tenantId)
      setCampaigns(data)
    } catch (err: any) {
      toast.error('Erro ao carregar campanhas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenantId])

  const filtered = campaigns.filter((c) => {
    if (
      status !== 'Todas' &&
      c.status !== status.toLowerCase() &&
      !(status === 'Enviando' && c.status === 'sending')
    ) {
      if (status === 'Rascunho' && c.status !== 'draft') return false
      if (status === 'Agendada' && c.status !== 'scheduled') return false
      if (status === 'Enviada' && c.status !== 'sent') return false
      if (status === 'Falha' && c.status !== 'failed') return false
    }
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return
    try {
      await emailService.deleteCampaign(id)
      setCampaigns(campaigns.filter((c) => c.id !== id))
      toast.success('Campanha removida')
    } catch (err: any) {
      toast.error('Erro ao excluir')
    }
  }

  const handleSendNow = async (campaign: EmailCampaign) => {
    if (!confirm(`Enviar campanha ${campaign.name} agora?`)) return
    try {
      setSendingId(campaign.id)
      const res = await emailService.sendCampaign(campaign.id)
      toast.success(`Campanha enviada com sucesso! ${res.sent_count} emails enviados.`)
      onUsageUpdate()
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar campanha')
    } finally {
      setSendingId(null)
    }
  }

  const getStatusBadge = (c: EmailCampaign) => {
    switch (c.status) {
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>
      case 'scheduled':
        return (
          <Badge variant="default">Agendada {new Date(c.scheduled_at!).toLocaleDateString()}</Badge>
        )
      case 'sending':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando
          </Badge>
        )
      case 'sent':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            Enviada
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Falha</Badge>
      default:
        return <Badge>{c.status}</Badge>
    }
  }

  const renderPercent = (count: number, total: number) => {
    if (total === 0) return '0%'
    return `${((count / total) * 100).toFixed(1)}%`
  }

  if (initError) return <div className="p-4 text-destructive">{initError}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Agendada">Agendada</SelectItem>
              <SelectItem value="Enviando">Enviando</SelectItem>
              <SelectItem value="Enviada">Enviada</SelectItem>
              <SelectItem value="Falha">Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setSelectedCampaign(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Campanha
        </Button>
      </div>

      {initLoading || loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed">
          <p className="text-muted-foreground text-center">
            Nenhuma campanha criada. Crie uma campanha para enviar emails aos seus pacientes.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSelectedCampaign(undefined)
              setDialogOpen(true)
            }}
          >
            Criar Campanha
          </Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead className="text-right">Abertos</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    {c.template ? (
                      c.template.name
                    ) : (
                      <span className="text-muted-foreground italic">Template removido</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(c)}</TableCell>
                  <TableCell className="text-right">{c.sent_count}</TableCell>
                  <TableCell className="text-right">
                    {c.opened_count}{' '}
                    {c.sent_count > 0 && (
                      <span className="text-xs text-muted-foreground block">
                        {renderPercent(c.opened_count, c.sent_count)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.clicked_count}{' '}
                    {c.sent_count > 0 && (
                      <span className="text-xs text-muted-foreground block">
                        {renderPercent(c.clicked_count, c.sent_count)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={sendingId === c.id}
                        >
                          {sendingId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <>
                            <DropdownMenuItem onClick={() => handleSendNow(c)}>
                              <Send className="mr-2 h-4 w-4" /> Enviar Agora
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCampaign(c)
                                setDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogOpen && (
        <CampaignDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          campaign={selectedCampaign}
          tenantId={tenantId}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
