import { useState, useEffect } from 'react'
import { fetchAppointmentAnalytics } from '@/services/reportAnalyticsService'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatCard } from './StatCard'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

export function ConsultasTab({ tenantId, dateRange, onDataLoaded }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchAppointmentAnalytics(tenantId, dateRange)
      setData(res)
      onDataLoaded(res)
    } catch (e) {
      setError(true)
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) loadData()
  }, [tenantId, dateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] w-full rounded-xl" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Ocorreu um erro ao carregar os dados.</p>
        <Button onClick={loadData} variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (data?.total_appointments === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          Nenhuma consulta encontrada no período. Agende consultas para ver as estatísticas aqui.
        </p>
        <Button onClick={() => (window.location.href = '/agenda')}>Ir para Agenda</Button>
      </div>
    )
  }

  const pieConfig = {
    confirmed: { label: 'Confirmadas', color: 'hsl(var(--primary))' },
    completed: { label: 'Realizadas', color: 'hsl(152, 68%, 40%)' },
    cancelled: { label: 'Canceladas', color: 'hsl(var(--destructive))' },
    no_show: { label: 'Faltas', color: 'hsl(45, 93%, 47%)' },
    pending: { label: 'Pendentes', color: 'hsl(var(--muted-foreground))' },
  }

  const pieData = [
    {
      status: 'confirmed',
      value: data.by_status['confirmed'] || 0,
      fill: 'var(--color-confirmed)',
    },
    {
      status: 'completed',
      value: data.by_status['completed'] || 0,
      fill: 'var(--color-completed)',
    },
    {
      status: 'cancelled',
      value: data.by_status['cancelled'] || 0,
      fill: 'var(--color-cancelled)',
    },
    { status: 'no_show', value: data.by_status['no_show'] || 0, fill: 'var(--color-no_show)' },
    { status: 'pending', value: data.by_status['pending'] || 0, fill: 'var(--color-pending)' },
  ].filter((d) => d.value > 0)

  const hourData = data.by_hour.filter((d: any) => d.count > 0)

  const weekConfig = {
    count: { label: 'Consultas', color: 'hsl(var(--primary))' },
  }

  const hourConfig = {
    count: { label: 'Consultas', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total de Consultas" value={data.total_appointments} />
        <StatCard label="Realizadas" value={data.by_status['completed'] || 0} />
        <StatCard label="Taxa de Faltas" value={`${data.no_show_rate.toFixed(1)}%`} />
        <StatCard label="Taxa de Cancelamento" value={`${data.cancellation_rate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-semibold mb-4">Consultas por Status</h3>
          <ChartContainer config={pieConfig} className="h-[240px] w-full">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="status"
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-semibold mb-4">Por Dia da Semana</h3>
          <ChartContainer config={weekConfig} className="h-[240px] w-full">
            <BarChart data={data.by_weekday}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-semibold mb-4">Horários Mais Populares</h3>
          <ChartContainer config={hourConfig} className="h-[240px] w-full">
            <BarChart data={hourData} layout="vertical" margin={{ left: -20 }}>
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                dataKey="hour"
                type="category"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="text-sm font-semibold">Detalhamento por Tipo</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Realizadas</TableHead>
              <TableHead>Faltas</TableHead>
              <TableHead>Taxa de Faltas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.type_details.map((t: any) => (
              <TableRow key={t.type}>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell>{t.total}</TableCell>
                <TableCell>{t.completed}</TableCell>
                <TableCell>{t.no_show}</TableCell>
                <TableCell>{t.no_show_rate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
