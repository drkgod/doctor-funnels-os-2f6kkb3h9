import { supabase } from '@/lib/supabase/client'

export interface AuditLogFilters {
  tenant_id?: string
  action?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
  sort_asc?: boolean
}

export const fetchAuditLogs = async (filters: AuditLogFilters) => {
  const page = filters.page || 1
  const per_page = filters.per_page || 20
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = supabase
    .from('audit_logs')
    .select(`*, profiles:user_id(full_name), tenants:tenant_id(name)`, { count: 'exact' })

  if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id)
  if (filters.action) query = query.ilike('action', `%${filters.action}%`)
  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00.000Z`)
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999Z`)

  query = query.order('created_at', { ascending: filters.sort_asc ?? false })
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: (data || []).map((item: any) => ({
      ...item,
      user_name: item.profiles?.full_name || null,
      tenant_name: item.tenants?.name || null,
    })),
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / per_page),
  }
}

export const fetchAllAuditLogsForExport = async (filters: AuditLogFilters) => {
  let query = supabase
    .from('audit_logs')
    .select(`*, profiles:user_id(full_name), tenants:tenant_id(name)`)
    .limit(10000)

  if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id)
  if (filters.action) query = query.ilike('action', `%${filters.action}%`)
  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00.000Z`)
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999Z`)

  query = query.order('created_at', { ascending: filters.sort_asc ?? false })

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((item: any) => ({
    ...item,
    user_name: item.profiles?.full_name || null,
    tenant_name: item.tenants?.name || null,
  }))
}

export const fetchAuditLogActions = async () => {
  const { data, error } = await supabase.from('audit_logs').select('action').limit(5000)

  if (error) throw error
  const unique = [...new Set(data.map((d: any) => d.action))].sort()
  return unique
}

export const fetchRecentActivity = async (limit = 20) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`*, profiles:user_id(full_name), tenants:tenant_id(name)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    user_name: item.profiles?.full_name || null,
    tenant_name: item.tenants?.name || null,
  }))
}

export const createAuditLog = async (
  tenant_id: string | null,
  user_id: string | null,
  action: string,
  entity_type: string | null = null,
  entity_id: string | null = null,
  details: any = null,
) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({ tenant_id, user_id, action, entity_type, entity_id, details })
    .select()
    .single()
  if (error) throw error
  return data
}

export const exportAuditLogsToCSV = async (filters: AuditLogFilters) => {
  const data = await fetchAllAuditLogsForExport(filters)

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      tenant_created: 'Tenant criado',
      tenant_updated: 'Tenant atualizado',
      module_toggled: 'Modulo alterado',
      api_key_added: 'Chave API adicionada',
      api_key_removed: 'Chave API removida',
      bot_created: 'Bot criado',
      bot_updated: 'Bot atualizado',
      whatsapp_instance_created: 'Instancia WhatsApp criada',
      whatsapp_connected: 'WhatsApp conectado',
      whatsapp_disconnected: 'WhatsApp desconectado',
      user_login: 'Login',
      user_signup: 'Cadastro',
    }
    if (map[action]) return map[action]
    const formatted = action.replace(/_/g, ' ')
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const headers = [
    'Data',
    'Tenant',
    'Usuario',
    'Acao',
    'Tipo Entidade',
    'ID Entidade',
    'Detalhes',
    'IP',
  ]
  const rows = data.map((log) => [
    new Date(log.created_at).toLocaleString('pt-BR'),
    (log.tenant_name || '-').replace(/"/g, '""'),
    (log.user_name || 'Sistema').replace(/"/g, '""'),
    formatAction(log.action).replace(/"/g, '""'),
    (log.entity_type || '-').replace(/"/g, '""'),
    (log.entity_id || '-').replace(/"/g, '""'),
    log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '-',
    (log.ip_address || '-').replace(/"/g, '""'),
  ])

  const csvContent = [headers.join(','), ...rows.map((e) => `"${e.join('","')}"`)].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `logs-doctorfunnels-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}
