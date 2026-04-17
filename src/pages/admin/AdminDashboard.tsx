import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, MessageSquare, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'

interface Tenant {
  id: string
  name: string
  plan: string
  status: string
  created_at: string
}

interface Activity {
  id: string
  timestamp: string
  action: string
  type: string
}

interface Stat {
  title: string
  value: string
  icon: any
  color: string
  bg: string
  trend: string
  positive: boolean
}

function translateAuditAction(action: string) {
  const map: Record<string, string> = {
    whatsapp_instance_created: 'Instância WhatsApp criada',
    whatsapp_connection_status: 'Status de conexão WhatsApp alterado',
    google_calendar_connected: 'Google Calendar conectado',
    google_calendar_disconnected: 'Google Calendar desconectado',
    email_campaign_sent: 'Campanha de email enviada',
    tenant_created: 'Novo tenant criado',
    tenant_updated: 'Tenant atualizado',
  }
  return map[action] || action
}

function translateEntityType(type: string) {
  const map: Record<string, string> = {
    tenant_api_keys: 'Integração',
    email_campaigns: 'Email',
    tenants: 'Tenant',
    Sistema: 'Sistema',
  }
  return map[type] || type
}

export const getPlanBadgeClasses = (plan: string) => {
  switch (plan?.toLowerCase()) {
    case 'professional':
      return 'bg-primary/10 text-primary'
    case 'clinic':
      return 'bg-accent/15 text-accent'
    default:
      return 'bg-secondary text-foreground'
  }
}

export const getStatusBadgeClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'ativo':
      return 'bg-success/10 text-success'
    case 'trial':
      return 'bg-amber-500/10 text-[hsl(45,93%,47%)]'
    case 'suspended':
    case 'suspenso':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [stats, setStats] = useState<Stat[]>([
    {
      title: 'Tenants Ativos',
      value: '-',
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      trend: '',
      positive: true,
    },
    {
      title: 'Total Pacientes',
      value: '-',
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      trend: '',
      positive: true,
    },
    {
      title: 'Mensagens / Mês',
      value: '-',
      icon: MessageSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      trend: '',
      positive: true,
    },
    {
      title: 'Automações Ativas',
      value: '-',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: '',
      positive: true,
    },
  ])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, name, plan, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        if (tenantsData) {
          setTenants(tenantsData)
        }

        // 2. Atividades Recentes
        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        if (logsData) {
          const formattedLogs = logsData.map((log) => {
            const date = new Date(log.created_at)
            let timeStr = ''
            if (isToday(date)) {
              timeStr = `Hoje, ${format(date, 'HH:mm')}`
            } else if (isYesterday(date)) {
              timeStr = `Ontem, ${format(date, 'HH:mm')}`
            } else {
              timeStr = format(date, 'dd MMM, HH:mm', { locale: ptBR })
            }

            return {
              id: log.id,
              timestamp: timeStr,
              action: translateAuditAction(log.action),
              type: translateEntityType(log.entity_type || 'Sistema'),
            }
          })
          setActivities(formattedLogs)
        }

        // 3. Stats
        const { count: activeTenants } = await supabase
          .from('tenants')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')

        const { count: totalPatients } = await supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count: msgsThisMonth } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())

        const { count: activeAutomations } = await supabase
          .from('automations')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        setStats((prev) => [
          { ...prev[0], value: activeTenants?.toString() || '0' },
          { ...prev[1], value: totalPatients?.toString() || '0' },
          { ...prev[2], value: msgsThisMonth?.toString() || '0' },
          { ...prev[3], value: activeAutomations?.toString() || '0' },
        ])
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="max-w-7xl mx-auto w-full pb-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-2">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 bg-card rounded-[var(--radius)] border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-[28px] font-bold text-foreground leading-none">
                    {stat.value}
                  </h3>
                  {stat.trend && (
                    <span
                      className={cn(
                        'text-[12px] flex items-center font-medium',
                        stat.positive ? 'text-green-500' : 'text-red-500',
                      )}
                    >
                      {stat.positive ? (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      )}
                      {stat.trend}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={cn('w-10 h-10 rounded-full flex items-center justify-center', stat.bg)}
              >
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-[16px] font-semibold text-foreground mb-4">Tenants Recentes</h2>
          <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">
                    <th className="px-4 py-3 whitespace-nowrap">Nome</th>
                    <th className="px-4 py-3 whitespace-nowrap">Plano</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground text-sm"
                      >
                        Nenhum tenant encontrado.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border hover:bg-secondary/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-[14px] whitespace-nowrap">
                          <Link
                            to={`/admin/tenants/${t.id}`}
                            className="font-medium text-primary cursor-pointer hover:underline"
                          >
                            {t.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[14px] whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block capitalize',
                              getPlanBadgeClasses(t.plan),
                            )}
                          >
                            {t.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block capitalize',
                              getStatusBadgeClasses(t.status),
                            )}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.created_at), 'dd/MM/yyyy')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-[16px] font-semibold text-foreground mb-4">Atividade Recente</h2>
          <div className="bg-card rounded-[var(--radius)] border border-border px-4 py-1">
            <div className="flex flex-col">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Nenhuma atividade recente.
                </div>
              ) : (
                activities.map((act, i) => (
                  <div
                    key={act.id}
                    className={cn(
                      'py-3 flex flex-col gap-1',
                      i !== activities.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {act.timestamp}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded inline-block">
                        {act.type}
                      </span>
                    </div>
                    <p className="text-[14px] text-foreground leading-snug mt-1">{act.action}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
