import { supabase } from '@/lib/supabase/client'

export const fetchAllIntegrations = async () => {
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select(`
      id, tenant_id, provider, metadata, status, created_at, updated_at,
      tenants:tenant_id(name, plan)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    tenant_name: item.tenants?.name || 'Desconhecido',
    tenant_plan: item.tenants?.plan || 'essential',
  }))
}

export const fetchIntegrationsByProvider = async (provider: string) => {
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select(`
      id, tenant_id, provider, metadata, status, created_at, updated_at,
      tenants:tenant_id(name, plan)
    `)
    .eq('provider', provider)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    tenant_name: item.tenants?.name || 'Desconhecido',
    tenant_plan: item.tenants?.plan || 'essential',
  }))
}

export const fetchIntegrationStats = async () => {
  const [
    { count: totalActive },
    { count: totalError },
    { count: totalExpired },
    { count: totalTenants },
    { data: activeUazapi },
  ] = await Promise.all([
    supabase
      .from('tenant_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('tenant_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error'),
    supabase
      .from('tenant_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'expired'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase
      .from('tenant_api_keys')
      .select('tenant_id')
      .eq('provider', 'uazapi')
      .eq('status', 'active'),
  ])

  const { data: allActiveIntegrations } = await supabase
    .from('tenant_api_keys')
    .select('tenant_id')
    .eq('status', 'active')

  const uniqueActiveTenants = new Set(allActiveIntegrations?.map((k) => k.tenant_id)).size
  const tenantsWithoutIntegration = (totalTenants || 0) - uniqueActiveTenants

  const whatsapp_connected = new Set(activeUazapi?.map((k) => k.tenant_id)).size

  return {
    total_active: totalActive || 0,
    total_error: totalError || 0,
    total_expired: totalExpired || 0,
    total_tenants: totalTenants || 0,
    whatsapp_connected: whatsapp_connected || 0,
    tenants_without_integration: tenantsWithoutIntegration > 0 ? tenantsWithoutIntegration : 0,
  }
}

export const updateIntegrationStatus = async (
  id: string,
  new_status: 'active' | 'error' | 'expired',
) => {
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .update({ status: new_status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteIntegration = async (id: string) => {
  const { error } = await supabase.from('tenant_api_keys').delete().eq('id', id)
  if (error) throw error
  return true
}

export const checkIntegrationHealth = async (id: string) => {
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select('provider, status, metadata')
    .eq('id', id)
    .single()
  if (error) throw error

  let summary = {}
  if (data.provider === 'uazapi' && data.metadata) {
    const md = data.metadata as any
    summary = { instance_status: md.instance_status, webhook_configured: md.webhook_configured }
  } else if (data.provider === 'google_calendar' && data.metadata) {
    const md = data.metadata as any
    summary = { email: md.email }
  }

  return {
    provider: data.provider,
    status: data.status,
    metadata_summary: summary,
  }
}
