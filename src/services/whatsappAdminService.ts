import { supabase } from '@/lib/supabase/client'

export const whatsappAdminService = {
  async registerInstance(tenant_id: string, instance_token: string) {
    const { data, error } = await supabase.functions.invoke('admin-whatsapp-create-instance', {
      body: { tenant_id, instance_token },
    })

    if (error) {
      throw new Error(error.message || 'Erro ao registrar instancia.')
    }
    if (data?.error) {
      throw new Error(data.error || 'Erro ao registrar instancia.')
    }
    return data
  },

  async getInstanceStatus(tenant_id: string) {
    const { data, error } = await supabase.functions.invoke('whatsapp-status', {
      body: { tenant_id },
    })

    if (error || data?.error) {
      return {
        connected: false,
        status: 'error',
        configured: false,
        message: data?.error || error?.message || 'Erro ao verificar status.',
      }
    }
    return data
  },

  async removeInstance(tenant_id: string) {
    const { error } = await supabase
      .from('tenant_api_keys')
      .delete()
      .eq('tenant_id', tenant_id)
      .eq('provider', 'uazapi')

    if (error) {
      throw new Error('Erro ao remover instancia.')
    }
    return { success: true }
  },
}
