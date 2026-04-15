export type UserRole = 'super_admin' | 'doctor' | 'secretary'
export type PipelineStage =
  | 'lead'
  | 'contact'
  | 'scheduled'
  | 'consultation'
  | 'return'
  | 'procedure'
export type ModuleKey =
  | 'crm'
  | 'whatsapp'
  | 'email'
  | 'agenda'
  | 'dashboard'
  | 'templates'
  | 'automations'
  | 'ai_chatbot'
export type TenantPlan = 'essential' | 'professional' | 'clinic'
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled'
export type ApiProvider = 'uazapi' | 'resend' | 'google_calendar'

export type Tenant = {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  logo_url: string | null
  address: string | null
  phone: string | null
  business_hours: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type TenantModule = {
  id: string
  tenant_id: string
  module_key: string
  is_enabled: boolean
  limits: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type TenantApiKey = {
  id: string
  tenant_id: string
  provider: string
  encrypted_key: string
  metadata: Record<string, unknown> | null
  status: string
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  tenant_id: string | null
  full_name: string
  role: string
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export type Patient = {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string | null
  cpf: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  source: string
  tags: string[]
  notes: string | null
  pipeline_stage: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Appointment = {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string | null
  datetime_start: string
  datetime_end: string
  type: string
  status: string
  google_event_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Conversation = {
  id: string
  tenant_id: string
  patient_id: string | null
  uazapi_chat_id: string | null
  phone_number: string
  last_message_at: string | null
  status: string
  is_bot_active: boolean
  unread_count: number
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  tenant_id: string
  conversation_id: string
  direction: string
  sender_type: string
  content: string
  message_type: string
  uazapi_message_id: string | null
  delivery_status: string | null
  created_at: string
}

export type EmailTemplate = {
  id: string
  tenant_id: string | null
  name: string
  subject: string
  html_content: string
  category: string
  variables: string[]
  is_global: boolean
  created_at: string
  updated_at: string
}

export type EmailCampaign = {
  id: string
  tenant_id: string
  template_id: string | null
  name: string
  segment_filter: Record<string, unknown> | null
  status: string
  scheduled_at: string | null
  sent_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  created_at: string
  updated_at: string
}

export type Automation = {
  id: string
  tenant_id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  action_type: string
  action_config: Record<string, unknown>
  is_active: boolean
  execution_count: number
  last_executed_at: string | null
  created_at: string
  updated_at: string
}

export type AutomationLog = {
  id: string
  tenant_id: string
  automation_id: string
  patient_id: string | null
  status: string
  error_message: string | null
  executed_at: string
}

export type BotConfig = {
  id: string
  tenant_id: string
  model: string
  system_prompt: string
  temperature: number
  max_tokens: number
  rag_enabled: boolean
  status: string
  created_at: string
  updated_at: string
}

export type BotDocument = {
  id: string
  tenant_id: string
  bot_config_id: string
  file_name: string
  file_url: string
  embedding_status: string
  chunk_count: number
  created_at: string
}

export type BotEmbedding = {
  id: string
  tenant_id: string
  bot_document_id: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown> | null
  created_at: string
}

export type TenantEmailUsage = {
  id: string
  tenant_id: string
  month: string
  emails_sent: number
  limit_reached: boolean
  created_at: string
  updated_at: string
}

export type TenantWhatsappUsage = {
  id: string
  tenant_id: string
  month: string
  messages_sent: number
  messages_received: number
  limit_reached: boolean
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: string
  tenant_id: string | null
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
