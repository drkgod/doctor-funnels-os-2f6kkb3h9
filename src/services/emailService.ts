import { supabase } from '@/lib/supabase/client'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  category: 'transactional' | 'marketing' | 'automation'
  variables: string[]
  is_global: boolean
  updated_at: string
  created_at: string
}

export interface EmailCampaign {
  id: string
  name: string
  template_id: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at: string | null
  segment_filter: any
  sent_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  updated_at: string
  created_at: string
  template?: { name: string } | null
}

export const emailService = {
  fetchTemplates: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data as EmailTemplate[]
  },

  fetchTemplateById: async (id: string) => {
    const { data, error } = await supabase.from('email_templates').select('*').eq('id', id).single()
    if (error) throw error
    return data as EmailTemplate
  },

  createTemplate: async (tenantId: string, data: Partial<EmailTemplate>) => {
    if (!data.name) throw new Error('Nome e obrigatório')
    if (!data.subject) throw new Error('Assunto e obrigatório')
    if (!data.html_content) throw new Error('Conteúdo e obrigatório')

    const { data: created, error } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        subject: data.subject,
        html_content: data.html_content,
        category: data.category || 'marketing',
        variables: data.variables || [],
        is_global: false,
      })
      .select()
      .single()
    if (error) throw error
    return created as EmailTemplate
  },

  updateTemplate: async (id: string, data: Partial<EmailTemplate>) => {
    const { data: updated, error } = await supabase
      .from('email_templates')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return updated as EmailTemplate
  },

  deleteTemplate: async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id)
    if (error) throw error
  },

  duplicateTemplate: async (id: string, tenantId: string) => {
    const template = await emailService.fetchTemplateById(id)
    return await emailService.createTemplate(tenantId, {
      ...template,
      name: `${template.name} (cópia)`,
    })
  },

  fetchCampaigns: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) throw error

    return data.map((c) => ({
      ...c,
      template: c.email_templates
        ? {
            name: Array.isArray(c.email_templates)
              ? c.email_templates[0]?.name
              : (c.email_templates as any).name,
          }
        : null,
    })) as EmailCampaign[]
  },

  fetchCampaignById: async (id: string) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  createCampaign: async (tenantId: string, data: any) => {
    if (!data.name) throw new Error('Nome e obrigatório')
    if (!data.template_id) throw new Error('Selecione um template')

    const { data: created, error } = await supabase
      .from('email_campaigns')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        template_id: data.template_id,
        segment_filter: data.segment_filter || null,
        scheduled_at: data.scheduled_at || null,
        status: data.scheduled_at ? 'scheduled' : 'draft',
      })
      .select()
      .single()
    if (error) throw error
    return created
  },

  updateCampaign: async (id: string, data: any) => {
    const { data: updated, error } = await supabase
      .from('email_campaigns')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return updated
  },

  deleteCampaign: async (id: string) => {
    const { error } = await supabase.from('email_campaigns').delete().eq('id', id)
    if (error) throw error
  },

  fetchEmailUsage: async (tenantId: string) => {
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    const monthStr = firstDayOfMonth.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('tenant_email_usage')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('month', monthStr)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  fetchRecipientEstimate: async (tenantId: string, filters: any) => {
    let query = supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('email', 'is', null)
      .is('deleted_at', null)

    if (filters) {
      if (filters.pipeline_stage && filters.pipeline_stage.length > 0) {
        query = query.in('pipeline_stage', filters.pipeline_stage)
      }
      if (filters.source && filters.source.length > 0) {
        query = query.in('source', filters.source)
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags)
      }
    }

    const { count, error } = await query
    if (error) throw error
    return count || 0
  },

  sendCampaign: async (campaignId: string) => {
    const { data, error } = await supabase.functions.invoke('send-email-campaign', {
      body: { campaign_id: campaignId },
    })
    if (error) throw error
    return data
  },
}
