import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { botService } from '@/services/botService'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
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
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Bot,
  Search,
  MoreHorizontal,
  Settings,
  Play,
  Pause,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const modelLabels: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'claude-sonnet': 'Claude Sonnet',
  'claude-haiku': 'Claude Haiku',
}

const ModelBadge = ({ model }: { model: string }) => {
  const styles: Record<string, string> = {
    'gpt-4o': 'bg-primary/10 text-primary',
    'gpt-4o-mini': 'bg-accent/10 text-accent',
    'claude-sonnet': 'bg-[hsl(270,60%,50%)]/10 text-[hsl(270,60%,50%)]',
    'claude-haiku': 'bg-[hsl(330,60%,50%)]/10 text-[hsl(330,60%,50%)]',
  }
  const label = modelLabels[model] || model
  const style = styles[model] || 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${style}`}
    >
      {label}
    </span>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === 'active'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
        isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          isActive ? 'bg-success' : 'bg-muted-foreground',
        )}
      />
      {isActive ? 'Ativo' : 'Pausado'}
    </span>
  )
}

export default function Bots() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [isCreating, setIsCreating] = useState(false)

  const [botToDelete, setBotToDelete] = useState<any>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadBots = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await botService.fetchBotConfigs()
      setBots(data)
    } catch (err: any) {
      setError('Não foi possível carregar os chatbots. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBots()
  }, [])

  const loadTenantsForCreate = async () => {
    try {
      const { data } = await supabase.from('tenants').select('id, name, plan')
      if (data) {
        const usedTenantIds = new Set(bots.map((b) => b.tenant_id))
        setTenants(data.filter((t) => !usedTenantIds.has(t.id)))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreate = async () => {
    if (!selectedTenant) return
    setIsCreating(true)
    try {
      await botService.createBotConfig(selectedTenant, selectedModel)
      toast({ description: 'Bot criado com sucesso' })
      setIsCreateDialogOpen(false)
      loadBots()
    } catch (e) {
      toast({ description: 'Erro ao criar bot', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleStatus = async (id: string, current: string) => {
    try {
      const newStatus = current === 'active' ? 'paused' : 'active'
      await botService.toggleBotStatus(id, newStatus)
      toast({ description: `Bot ${newStatus === 'active' ? 'ativado' : 'pausado'} com sucesso` })
      loadBots()
    } catch (e) {
      toast({ description: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!botToDelete) return
    try {
      await botService.deleteBotConfig(botToDelete.id)
      toast({ description: 'Bot excluído com sucesso' })
      setBotToDelete(null)
      loadBots()
    } catch (e) {
      toast({ description: 'Erro ao excluir bot', variant: 'destructive' })
    }
  }

  const filteredBots = useMemo(() => {
    return bots.filter((b) => {
      const matchSearch = b.tenant_name.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchStatus = statusFilter === 'all' || b.status === statusFilter
      const matchModel = modelFilter === 'all' || b.model === modelFilter
      return matchSearch && matchStatus && matchModel
    })
  }, [bots, debouncedSearch, statusFilter, modelFilter])

  const paginatedBots = filteredBots.slice((page - 1) * 20, page * 20)
  const totalPages = Math.ceil(filteredBots.length / 20)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .shimmer-bg {
          position: relative;
          overflow: hidden;
          background-color: hsl(var(--secondary) / 0.3);
        }
        .shimmer-bg::after {
          content: "";
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(90deg, transparent, hsl(var(--secondary) / 0.5), transparent);
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chatbots WhatsApp</h1>
        <p className="text-muted-foreground">Gerenciar bots e prompts por tenant</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tenant..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-10 w-full md:min-w-[240px] bg-input border-border rounded-md text-[14px]"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full md:min-w-[140px] h-10 border-border rounded-md">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={modelFilter}
          onValueChange={(v) => {
            setModelFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full md:min-w-[140px] h-10 border-border rounded-md">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="claude-sonnet">Claude Sonnet</SelectItem>
            <SelectItem value="claude-haiku">Claude Haiku</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          onClick={() => {
            setIsCreateDialogOpen(true)
            loadTenantsForCreate()
          }}
          className="w-full md:w-auto h-10 px-4 font-semibold"
        >
          Criar Bot
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow className="border-border">
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                Tenant
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                Modelo
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                Status
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                RAG
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                Prompt
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto">
                Atualizado
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px] p-[12px] px-[16px] h-auto w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-4 w-32 rounded" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-4 w-10 rounded" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-4 w-48 rounded" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="shimmer-bg h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedBots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 border-b-0">
                  {error ? (
                    <div className="pt-[80px] pb-[80px] text-center flex flex-col items-center">
                      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                      <p className="text-[14px] font-medium text-destructive">{error}</p>
                      <Button variant="outline" onClick={loadBots} className="mt-6 h-10">
                        Tentar novamente
                      </Button>
                    </div>
                  ) : bots.length === 0 ? (
                    <div className="pt-[80px] pb-[80px] text-center flex flex-col items-center">
                      <Bot className="w-12 h-12 text-muted-foreground" />
                      <h3 className="text-[18px] font-semibold mt-4">Nenhum chatbot configurado</h3>
                      <p className="text-[14px] text-muted-foreground mt-2">
                        Crie o primeiro chatbot para um tenant.
                      </p>
                      <Button
                        onClick={() => {
                          setIsCreateDialogOpen(true)
                          loadTenantsForCreate()
                        }}
                        className="mt-6 h-10 px-4 font-semibold"
                      >
                        Criar Bot
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-[80px] pb-[80px] text-center">
                      <p className="text-[14px] text-muted-foreground">
                        Nenhum chatbot encontrado para os filtros atuais.
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedBots.map((bot) => (
                <TableRow
                  key={bot.id}
                  className="border-border border-b hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/bots/${bot.id}`)}
                >
                  <TableCell className="p-[12px] px-[16px]">
                    <Link
                      to={`/admin/tenants/${bot.tenant_id}`}
                      className="font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bot.tenant_name}
                    </Link>
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <ModelBadge model={bot.model} />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <StatusBadge status={bot.status} />
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <span
                      className={cn(
                        bot.rag_enabled ? 'text-success font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {bot.rag_enabled ? 'Sim' : 'Não'}
                    </span>
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]">
                    <div className="text-[12px] text-muted-foreground max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {bot.system_prompt ? (
                        bot.system_prompt
                      ) : (
                        <span className="italic">Sem prompt configurado</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px] text-[14px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(bot.updated_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="p-[12px] px-[16px]" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-[160px] bg-card border-border shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-md"
                      >
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/bots/${bot.id}`)}
                          className="py-2 px-3 text-[13px] cursor-pointer hover:bg-secondary"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(bot.id, bot.status)}
                          className="py-2 px-3 text-[13px] cursor-pointer hover:bg-secondary"
                        >
                          {bot.status === 'active' ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {bot.status === 'active' ? 'Pausar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setBotToDelete(bot)}
                          className="py-2 px-3 text-[13px] cursor-pointer hover:bg-secondary text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 0 && filteredBots.length > 0 && (
          <div className="flex justify-between items-center py-[12px] px-[16px] border-t border-border bg-card">
            <span className="text-[13px] text-muted-foreground">
              Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, filteredBots.length)} de{' '}
              {filteredBots.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={page === 1}
                className={cn(
                  'w-8 h-8 p-0 rounded-md text-[13px]',
                  page === 1 ? 'opacity-50' : 'hover:bg-secondary',
                )}
                onClick={() => setPage((p) => p - 1)}
              >
                &lt;
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1
                return (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'ghost'}
                    className={cn(
                      'w-8 h-8 p-0 rounded-md text-[13px]',
                      page === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'hover:bg-secondary',
                    )}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              })}
              <Button
                variant="ghost"
                disabled={page === totalPages}
                className={cn(
                  'w-8 h-8 p-0 rounded-md text-[13px]',
                  page === totalPages ? 'opacity-50' : 'hover:bg-secondary',
                )}
                onClick={() => setPage((p) => p + 1)}
              >
                &gt;
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[480px] p-6 rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold">Criar Chatbot IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[13px] font-medium text-muted-foreground mb-1 block">
                Tenant
              </Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="h-10 text-[14px] border-border rounded-md">
                  <SelectValue placeholder="Selecione um tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.length === 0 ? (
                    <div className="p-6 text-[14px] text-muted-foreground italic text-center">
                      Todos os tenants já possuem um chatbot.
                    </div>
                  ) : (
                    tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{t.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 rounded-full"
                          >
                            {t.plan}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[13px] font-medium text-muted-foreground mb-1 block">
                Modelo
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-10 text-[14px] border-border rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modelLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-10">
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedTenant || isCreating}
              className="h-10"
            >
              {isCreating ? 'Criando...' : 'Criar Bot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!botToDelete} onOpenChange={(o) => !o && setBotToDelete(null)}>
        <DialogContent className="max-w-[480px] p-6 rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold">Excluir chatbot</DialogTitle>
            <DialogDescription className="text-[14px] leading-[1.6] mt-2">
              Tem certeza? O bot do tenant{' '}
              <span className="font-semibold">{botToDelete?.tenant_name}</span> e todos os
              documentos RAG serão excluídos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setBotToDelete(null)} className="h-10">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="h-10 text-white bg-destructive"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
