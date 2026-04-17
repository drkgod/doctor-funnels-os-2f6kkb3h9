import { useState, useEffect } from 'react'
import { fetchPatientAnalytics } from '@/services/reportAnalyticsService'
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { StatCard } from './StatCard'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export function PacientesTab({ tenantId, dateRange, onDataLoaded }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchPatientAnalytics(tenantId, dateRange)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
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

  if (data?.total_patients === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          Nenhum paciente encontrado no período. Cadastre pacientes no CRM para ver as estatísticas
          aqui.
        </p>
        <Button onClick={() => (window.location.href = '/crm')}>Ir para CRM</Button>
      </div>
    )
  }

  const retentionData = [
    { name: 'Retornaram', value: data.returning_patients, fill: 'hsl(var(--primary))' },
    {
      name: 'Única Consulta',
      value: Math.max(0, data.total_patients - data.returning_patients),
      fill: 'hsl(var(--muted))',
    },
  ]

  const monthConfig = {
    count: { label: 'Novos Pacientes', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total de Pacientes" value={data.total_patients} />
        <StatCard label="Novos no Período" value={data.new_in_period} />
        <StatCard label="Taxa de Retorno" value={`${data.retention_rate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-semibold mb-4">Novos Pacientes por Mês</h3>
          <ChartContainer config={monthConfig} className="h-[260px] w-full">
            <BarChart data={data.by_month}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl flex flex-col items-center justify-center relative">
          <h3 className="text-sm font-semibold w-full text-left absolute top-5 left-5">
            Retenção de Pacientes
          </h3>
          <div className="w-[200px] h-[200px] mt-8 relative">
            <PieChart width={200} height={200}>
              <Pie
                data={retentionData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {retentionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold">{data.retention_rate.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground mt-1">Retenção</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
