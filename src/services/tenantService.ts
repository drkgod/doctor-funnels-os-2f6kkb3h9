import { supabase } from '@/lib/supabase/client'
import { TablesUpdate } from '@/lib/supabase/types'

export const tenantService = {
  async fetchTenants(filters?: { plan?: string; status?: string; search?: string }) {
    let query = supabase.from('tenants').select('*, tenant_modules(is_enabled)', { count: 'exact' })

    if (filters?.plan && filters.plan !== 'Todos os planos') {
      query = query.eq('plan', filters.plan.toLowerCase())
    }
    if (filters?.status && filters.status !== 'Todos os status') {
      const statusMap: Record<string, string> = {
        Ativo: 'active',
        Trial: 'trial',
        Suspenso: 'suspended',
        Cancelado: 'cancelled',
      }
      query = query.eq('status', statusMap[filters.status])
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, count, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { data, count }
  },

  async fetchTenantById(id: string) {
    const [tenantRes, modulesRes, apiKeysRes, usersRes] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', id).single(),
      supabase
        .from('tenant_modules')
        .select('*')
        .eq('tenant_id', id)
        .order('module_key', { ascending: true }),
      supabase.from('tenant_api_keys').select('*').eq('tenant_id', id),
      supabase.from('profiles').select('*').eq('tenant_id', id),
    ])

    if (tenantRes.error) throw tenantRes.error

    return {
      tenant: tenantRes.data,
      modules: modulesRes.data || [],
      apiKeys: apiKeysRes.data || [],
      users: usersRes.data || [],
    }
  },

  async createTenant(name: string, slug: string, plan: string) {
    const { data, error } = await supabase
      .from('tenants')
      .insert({ name, slug, plan, status: 'trial' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateTenant(id: string, updates: Partial<TablesUpdate<'tenants'>>) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteTenant(id: string) {
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    if (error) throw error
    return true
  },

  async toggleModule(tenant_id: string, module_key: string, is_enabled: boolean) {
    const { data, error } = await supabase
      .from('tenant_modules')
      .update({ is_enabled })
      .eq('tenant_id', tenant_id)
      .eq('module_key', module_key)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateModuleLimits(tenant_id: string, module_key: string, limits: any) {
    const { data, error } = await supabase
      .from('tenant_modules')
      .update({ limits })
      .eq('tenant_id', tenant_id)
      .eq('module_key', module_key)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addApiKey(tenant_id: string, provider: string, key: string, metadata: any = {}) {
    const { data: session } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('encrypt-api-key', {
      body: { key_value: key },
      headers: { Authorization: `Bearer ${session.session?.access_token}` },
    })

    if (error) throw error
    if (!data?.encrypted) throw new Error('Falha ao criptografar a chave')

    const { data: apiKey, error: insertError } = await supabase
      .from('tenant_api_keys')
      .insert({ tenant_id, provider, encrypted_key: data.encrypted, metadata, status: 'active' })
      .select()
      .single()

    if (insertError) throw insertError
    return apiKey
  },

  async removeApiKey(id: string) {
    const { error } = await supabase.from('tenant_api_keys').delete().eq('id', id)
    if (error) throw error
    return true
  },

  async assignUserToTenant(user_id: string, tenant_id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ tenant_id })
      .eq('id', user_id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removeUserFromTenant(user_id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ tenant_id: null })
      .eq('id', user_id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async searchUnassignedUsers(search: string) {
    let query = supabase.from('profiles').select('*').is('tenant_id', null)
    if (search) query = query.ilike('full_name', `%${search}%`)
    const { data, error } = await query.limit(10)
    if (error) throw error
    return data
  },

  async createWhatsappInstance(tenant_id: string) {
    const { data: session } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('admin-whatsapp-create-instance', {
      body: { tenant_id },
      headers: { Authorization: `Bearer ${session.session?.access_token}` },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },
}
