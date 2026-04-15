import React, { useState, useEffect } from 'react'
import { Search, ScrollText, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import {
  fetchAuditLogs,
  fetchAuditLogActions,
  exportAuditLogsToCSV,
} from '@/services/auditLogService'

export default function Logs() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<any[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [filters, setFilters] = useState({
    actionSearch: '',
    tenant_id: 'all',
    action: 'all',
    date_from: '',
    date_to: '',
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortAsc, setSortAsc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.actionSearch), 300)
    return () => clearTimeout(timer)
  }, [filters.actionSearch])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const [tenantsRes, actionsData, logsData] = await Promise.all([
        supabase.from('tenants').select('id, name').order('name'),
        fetchAuditLogActions(),
        fetchAuditLogs({
          page,
          per_page: 20,
          sort_asc: sortAsc,
          tenant_id: filters.tenant_id !== 'all' ? filters.tenant_id : undefined,
          action: filters.action !== 'all' ? filters.action : debouncedSearch || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        }),
      ])
      setTenants(tenantsRes.data || [])
      setActions(actionsData)
      setLogs(logsData.data)
      setTotal(logsData.total)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [
    page,
    sortAsc,
    debouncedSearch,
    filters.tenant_id,
    filters.action,
    filters.date_from,
    filters.date_to,
  ])

  const handleExport = async () => {
    try {
      await exportAuditLogsToCSV({
        tenant_id: filters.tenant_id !== 'all' ? filters.tenant_id : undefined,
        action: filters.action !== 'all' ? filters.action : debouncedSearch || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        sort_asc: sortAsc,
      })
    } catch {
      toast({ title: 'Erro ao exportar CSV', variant: 'destructive' })
    }
  }

  const formatActionName = (action: string) => {
    const map: Record<string, string> = {
      tenant_created: 'Tenant criado',
      tenant_updated: 'Tenant atualizado',
      module_toggled: 'Módulo alterado',
      api_key_added: 'Chave API adicionada',
      api_key_removed: 'Chave API removida',
      bot_created: 'Bot criado',
      bot_updated: 'Bot atualizado',
      whatsapp_instance_created: 'Instância WhatsApp criada',
      whatsapp_connected: 'WhatsApp conectado',
      whatsapp_disconnected: 'WhatsApp desconectado',
      user_login: 'Login',
      user_signup: 'Cadastro',
    }
    if (map[action]) return map[action]
    return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  }

  const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    return Object.keys(obj).reduce((acc: Record<string, string>, k) => {
      const pre = prefix.length ? prefix + '.' : ''
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]))
        Object.assign(acc, flattenObject(obj[k], pre + k))
      else acc[pre + k] = String(obj[k])
      return acc
    }, {})
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <p className="text-destructive mb-4">Não foi possível carregar os logs. Tente novamente.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground text-sm">Auditoria e monitoramento de eventos</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ação..."
            className="pl-9 h-10"
            value={filters.actionSearch}
            onChange={(e) => setFilters((f) => ({ ...f, actionSearch: e.target.value }))}
          />
        </div>
        <Select
          value={filters.tenant_id}
          onValueChange={(v) => setFilters((f) => ({ ...f, tenant_id: v, page: 1 }))}
        >
          <SelectTrigger className="w-[200px] h-10">
            <SelectValue placeholder="Todos os tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.action}
          onValueChange={(v) => setFilters((f) => ({ ...f, action: v, page: 1 }))}
        >
          <SelectTrigger className="w-[200px] h-10">
            <SelectValue placeholder="Todas as ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {formatActionName(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-10 w-[140px]"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value, page: 1 }))}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            className="h-10 w-[140px]"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value, page: 1 }))}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() =>
            setFilters({
              actionSearch: '',
              tenant_id: 'all',
              action: 'all',
              date_from: '',
              date_to: '',
            })
          }
        >
          Limpar filtros
        </Button>
        <Button variant="outline" className="ml-auto h-10" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary text-muted-foreground uppercase text-xs font-semibold tracking-wide">
            <TableRow>
              <TableHead
                className="px-4 py-3 cursor-pointer w-[160px]"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Data {sortAsc ? '↑' : '↓'}
              </TableHead>
              <TableHead className="px-4 py-3">Tenant</TableHead>
              <TableHead className="px-4 py-3">Usuário</TableHead>
              <TableHead className="px-4 py-3">Ação</TableHead>
              <TableHead className="px-4 py-3">Tipo</TableHead>
              <TableHead className="px-4 py-3">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium">Nenhum log registrado</p>
                  <p className="text-sm text-muted-foreground">
                    Os logs de atividade aparecerão aqui conforme o sistema for utilizado.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const detailsPreview = log.details
                  ? JSON.stringify(log.details).slice(0, 80) +
                    (JSON.stringify(log.details).length > 80 ? '...' : '')
                  : '-'
                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => setExpanded((e) => ({ ...e, [log.id]: !e[log.id] }))}
                    >
                      <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{log.tenant_name || '-'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {log.user_name || 'Sistema'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {formatActionName(log.action)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{log.entity_type || '-'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm flex items-center gap-2">
                        <span className="truncate max-w-[200px] text-xs text-muted-foreground font-mono">
                          {detailsPreview}
                        </span>
                        {expanded[log.id] ? (
                          <ChevronUp className="w-4 h-4 ml-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded[log.id] && log.details && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-4">
                          <ul className="space-y-1 text-sm font-mono whitespace-pre-wrap">
                            {Object.entries(flattenObject(log.details)).map(([k, v]) => (
                              <li key={k}>
                                <strong className="font-semibold text-foreground">{k}:</strong>{' '}
                                <span className="text-muted-foreground">{v}</span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {total === 0 ? 0 : (page - 1) * 20 + 1} a {Math.min(page * 20, total)} de{' '}
          {total} logs. Total: {total} registros
        </p>
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
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
