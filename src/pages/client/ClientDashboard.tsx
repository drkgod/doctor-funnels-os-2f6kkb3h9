import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Users, Calendar, FileText, Mic } from 'lucide-react'
import {
  formatDistanceToNow,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'

import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/useTenant'
import { ModuleGate } from '@/components/ModuleGate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { fetchDashboardStats, fetchDoctorStats } from '@/services/dashboardService'

type RangeOption = 'hoje' | 'esta_semana' | 'este_mes' | 'ultimos_30_dias' | 'este_ano'

const rangeLabels: Record<RangeOption, string> = {
  hoje: 'Hoje',
  esta_semana: 'Esta Semana',
  este_mes: 'Este Mês',
  ultimos_30_dias: 'Últimos 30 Dias',
  este_ano: 'Este Ano',
}

const getRangeDates = (option: RangeOption) => {
  const now = new Date()
  switch (option) {
    case 'hoje':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
    case 'esta_semana':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to: endOfDay(now).toISOString(),
      }
    case 'este_mes':
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() }
    case 'ultimos_30_dias':
      return { from: subDays(startOfDay(now), 30).toISOString(), to: endOfDay(now).toISOString() }
    case 'este_ano':
      return { from: startOfYear(now).toISOString(), to: endOfYear(now).toISOString() }
  }
}

const chartConfigAppointments = {
  count: { label: 'Consultas', color: 'hsl(var(--primary))' },
}

const chartConfigPatients = {
  count: { label: 'Pacientes', color: 'hsl(var(--primary))' },
}

export default function ClientDashboardWrapper() {
  return (
    <ModuleGate moduleKey="dashboard">
      <ClientDashboard />
    </ModuleGate>
  )
}

function ClientDashboard() {
  const { user } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [role, setRole] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rangeOption, setRangeOption] = useState<RangeOption>('este_mes')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setRole(data.role)
      })
  }, [user])

  const loadData = useCallback(async () => {
    if (!tenant?.id || !user || !role) return

    try {
      setLoading(true)
      setError(false)
      const range = getRangeDates(rangeOption)

      let data
      if (role === 'doctor') {
        data = await fetchDoctorStats(tenant.id, user.id, range)
      } else {
        data = await fetchDashboardStats(tenant.id, range)
      }
      setStats(data)
    } catch (err) {
      console.error(err)
      setError(true)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive',
        action: (
          <ToastAction altText="Tentar novamente" onClick={() => window.location.reload()}>
            Tentar Novamente
          </ToastAction>
        ),
      })
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, user, role, rangeOption, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading || (!stats && !error)) {
    return (
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-full max-w-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">
          Ocorreu um erro ao carregar os dados do dashboard.
        </p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )
  }

  const isWelcome = stats.total_patients === 0 && stats.total_appointments === 0
  const pctSigned =
    stats.total_records > 0 ? Math.round((stats.signed_records / stats.total_records) * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral da sua clínica</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(rangeLabels) as RangeOption[]).map((opt) => (
            <Button
              key={opt}
              variant={rangeOption === opt ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRangeOption(opt)}
              className="text-xs h-8 rounded-full px-4"
            >
              {rangeLabels[opt]}
            </Button>
          ))}
        </div>
      </div>

      {isWelcome ? (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 md:p-12 text-center space-y-8 mt-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              Bem-vindo ao Doctor Funnels!
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Para aproveitar ao máximo a plataforma, siga os passos abaixo para configurar sua
              clínica.
            </p>
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-6 text-sm text-foreground">
            <div className="flex-1 flex flex-col items-center gap-3 p-4 bg-background/50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-center">
                1.{' '}
                <Link to="/crm" className="text-primary hover:underline">
                  Cadastre seus pacientes no CRM
                </Link>
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-3 p-4 bg-background/50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-center">
                2.{' '}
                <Link to="/agenda" className="text-primary hover:underline">
                  Agende consultas na Agenda
                </Link>
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-3 p-4 bg-background/50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-center">
                3.{' '}
                <Link to="/prontuarios" className="text-primary hover:underline">
                  Crie prontuários no módulo Prontuários
                </Link>
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/crm')} size="lg" className="mt-8 px-8">
            Começar
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-muted-foreground">Pacientes</h3>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.total_patients}</div>
                <div
                  className={cn(
                    'text-xs mt-1 font-medium',
                    stats.new_patients > 0 ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {stats.new_patients > 0 ? `+${stats.new_patients} novos` : '0 novos'}
                </div>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-muted-foreground">Consultas</h3>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.total_appointments}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{stats.completed_appointments} realizadas</span>
                  {stats.no_show_appointments > 0 && (
                    <span className="text-destructive font-medium border-l pl-2 border-border">
                      {stats.no_show_appointments} faltas
                    </span>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-muted-foreground">Prontuários</h3>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.total_records}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.signed_records} assinados ({pctSigned}%)
                </div>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-muted-foreground">Transcrições IA</h3>
                <Mic className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.total_transcriptions}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.total_transcriptions === 0
                    ? 'Nenhuma transcrição ainda'
                    : 'consultas transcritas'}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 flex flex-col">
              <h3 className="text-base font-semibold mb-4">Consultas da Semana</h3>
              <div className="flex-1">
                {stats.daily_appointments.every((d: any) => d.count === 0) ? (
                  <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma consulta nos últimos 7 dias
                  </div>
                ) : (
                  <ChartContainer config={chartConfigAppointments} className="h-[240px] w-full">
                    <BarChart
                      data={stats.daily_appointments}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </Card>

            <Card className="p-5 flex flex-col">
              <h3 className="text-base font-semibold mb-4">Crescimento de Pacientes</h3>
              <div className="flex-1">
                {stats.monthly_patients.every((d: any) => d.count === 0) ? (
                  <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum paciente registrado
                  </div>
                ) : (
                  <ChartContainer config={chartConfigPatients} className="h-[240px] w-full">
                    <LineChart
                      data={stats.monthly_patients}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-count)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--color-count)' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold">Próximas Consultas</h3>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {stats.upcoming_appointments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg h-full min-h-[200px]">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhuma consulta agendada para os próximos 7 dias
                    </p>
                    <Button size="sm" onClick={() => navigate('/agenda')}>
                      Agendar Consulta
                    </Button>
                  </div>
                ) : (
                  stats.upcoming_appointments.map((apt: any) => {
                    const isToday =
                      new Date(apt.datetime_start).toDateString() === new Date().toDateString()
                    return (
                      <div
                        key={apt.id}
                        onClick={() => navigate(`/agenda?date=${apt.datetime_start}`)}
                        className={cn(
                          'p-3 rounded-md border border-border flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors bg-card',
                          isToday && 'border-l-4 border-l-primary',
                        )}
                      >
                        <div>
                          <div className="font-medium text-sm">{apt.patient_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(apt.datetime_start), "dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold uppercase"
                          >
                            {apt.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {apt.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>

            <Card className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold">Prontuários Recentes</h3>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {stats.recent_records.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg h-full min-h-[200px]">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhum prontuário criado ainda
                    </p>
                    <Button size="sm" onClick={() => navigate('/prontuarios')}>
                      Novo Prontuário
                    </Button>
                  </div>
                ) : (
                  stats.recent_records.map((rec: any) => (
                    <div
                      key={rec.id}
                      onClick={() => navigate(`/prontuarios/${rec.id}`)}
                      className="p-3 rounded-md border border-border flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors bg-card"
                    >
                      <div>
                        <div className="font-medium text-sm">{rec.patient_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Atualizado há{' '}
                          {formatDistanceToNow(new Date(rec.updated_at), { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                          {rec.record_type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {rec.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
