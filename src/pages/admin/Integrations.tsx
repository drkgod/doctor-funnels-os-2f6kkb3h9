import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plug,
  AlertTriangle,
  Clock,
  MessageCircle,
  Building2,
  Search,
  MoreHorizontal,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  fetchAllIntegrations,
  fetchIntegrationStats,
  updateIntegrationStatus,
  deleteIntegration,
} from '@/services/integrationService'

export default function Integrations() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const [statsData, listData] = await Promise.all([
        fetchIntegrationStats(),
        fetchAllIntegrations(),
      ])
      setStats(statsData)
      setIntegrations(listData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (id: string, status: 'active' | 'error') => {
    try {
      await updateIntegrationStatus(id, status)
      toast({ title: 'Status atualizado' })
      loadData()
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteIntegration(deleteId)
      toast({ title: 'Integração removida' })
      setDeleteId(null)
      loadData()
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  const filteredData = useMemo(() => {
    let data = integrations
    if (activeTab === 'uazapi') data = data.filter((i) => i.provider === 'uazapi')
    else if (activeTab === 'resend') data = data.filter((i) => i.provider === 'resend')
    else if (activeTab === 'google_calendar')
      data = data.filter((i) => i.provider === 'google_calendar')
    if (debouncedSearch)
      data = data.filter((i) => i.tenant_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    return data
  }, [integrations, activeTab, debouncedSearch])

  const paginatedData = useMemo(
    () => filteredData.slice((page - 1) * 20, page * 20),
    [filteredData, page],
  )
  useEffect(() => {
    setPage(1)
  }, [activeTab, debouncedSearch])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <p className="text-destructive mb-4">
          Não foi possível carregar as integrações. Tente novamente.
        </p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-muted-foreground text-sm">Conexões com serviços externos e APIs</p>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Plug className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Integrações Ativas</p>
                <p className="text-2xl font-bold">{stats.total_active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Com Erro</p>
                <p className="text-2xl font-bold">{stats.total_error}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[hsl(45_93%_47%)]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[hsl(45_93%_47%)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expiradas</p>
                <p className="text-2xl font-bold">{stats.total_expired}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">WhatsApp Conectados</p>
                <p className="text-2xl font-bold">
                  {stats.whatsapp_connected}/{stats.total_tenants}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tenants sem Integração</p>
                <p className="text-2xl font-bold">{stats.tenants_without_integration}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="uazapi">UAZAPI</TabsTrigger>
          <TabsTrigger value="resend">Resend</TabsTrigger>
          <TabsTrigger value="google_calendar">Google Calendar</TabsTrigger>
        </TabsList>

        {activeTab === 'uazapi' && (
          <div className="mb-4 p-3 bg-secondary rounded-md text-sm font-medium">
            {
              integrations.filter(
                (i) =>
                  i.provider === 'uazapi' &&
                  i.status === 'active' &&
                  i.metadata?.instance_status === 'connected',
              ).length
            }{' '}
            conectados,{' '}
            {
              integrations.filter(
                (i) =>
                  i.provider === 'uazapi' &&
                  i.status === 'active' &&
                  i.metadata?.instance_status !== 'connected',
              ).length
            }{' '}
            desconectados,{' '}
            {integrations.filter((i) => i.provider === 'uazapi' && i.status === 'error').length} com
            erro
          </div>
        )}

        <div className="flex mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tenant..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="border rounded-md bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary text-muted-foreground uppercase text-xs font-semibold tracking-wide">
              <TableRow>
                <TableHead className="px-4 py-3">Tenant</TableHead>
                <TableHead className="px-4 py-3">Provedor</TableHead>
                <TableHead className="px-4 py-3">Plano</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Detalhes</TableHead>
                <TableHead className="px-4 py-3">Atualizado</TableHead>
                <TableHead className="px-4 py-3 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && integrations.length === 0 ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Plug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium">Nenhuma integração configurada</p>
                    <p className="text-sm text-muted-foreground">
                      As integrações aparecerão aqui quando os tenants forem configurados.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-secondary/50">
                    <TableCell className="px-4 py-3">
                      <Link
                        to={`/admin/tenants/${item.tenant_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.tenant_name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {item.provider === 'uazapi'
                        ? 'UAZAPI (WhatsApp)'
                        : item.provider === 'resend'
                          ? 'Resend (Email)'
                          : 'Google Calendar'}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline">{item.tenant_plan}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={
                          item.status === 'active'
                            ? 'bg-success/10 text-success hover:bg-success/20'
                            : item.status === 'error'
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-[hsl(45_93%_47%)]/10 text-[hsl(45_93%_47%)] hover:bg-[hsl(45_93%_47%)]/20'
                        }
                      >
                        {item.status === 'active'
                          ? 'Ativo'
                          : item.status === 'error'
                            ? 'Erro'
                            : 'Expirado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {item.provider === 'uazapi'
                        ? `${item.metadata?.instance_status || 'N/A'} ${item.metadata?.phone_number ? `(${item.metadata.phone_number})` : ''}`
                        : item.provider === 'resend'
                          ? 'Configurado'
                          : item.metadata?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/tenants/${item.tenant_id}`}>Ver Tenant</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')}>
                            Marcar como Ativo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'error')}>
                            Marcar como Erro
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(item.id)}
                            className="text-destructive"
                          >
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredData.length > 20 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, filteredData.length)} de{' '}
              {filteredData.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= filteredData.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
