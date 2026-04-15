import { format, isSameDay } from 'date-fns'
import { Appointment } from '@/services/appointmentService'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DayViewProps {
  currentDate: Date
  appointments: Appointment[]
  onSlotClick: (time: string) => void
  onAppointmentClick: (appointment: Appointment) => void
  onNewAppointment: () => void
}

export const typeMap = {
  consultation: {
    label: 'Consulta',
    class: 'bg-primary/15 border-primary text-primary',
    dot: 'bg-primary',
  },
  return: {
    label: 'Retorno',
    class: 'bg-accent/15 border-accent text-accent',
    dot: 'bg-accent',
  },
  procedure: {
    label: 'Procedimento',
    class: 'bg-[hsl(45,93%,47%,0.15)] border-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]',
    dot: 'bg-[hsl(45,93%,47%)]',
  },
}

export const statusMap = {
  pending: { label: 'Pendente', class: 'bg-amber-500/15 text-amber-600' },
  confirmed: { label: 'Confirmado', class: 'bg-emerald-500/15 text-emerald-600' },
  completed: { label: 'Concluído', class: 'bg-primary/15 text-primary' },
  no_show: { label: 'No-show', class: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelado', class: 'bg-muted text-muted-foreground' },
}

export function DayView({
  currentDate,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onNewAppointment,
}: DayViewProps) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7)
  const dayAppointments = appointments.filter((a) =>
    isSameDay(new Date(a.datetime_start), currentDate),
  )

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const isToday = isSameDay(currentDate, new Date())

  const getTopPosition = (date: Date) => {
    const startMins = date.getHours() * 60 + date.getMinutes()
    const baseMins = 7 * 60
    return ((startMins - baseMins) / 60) * 64
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 h-full overflow-hidden">
      <div className="bg-card border border-border rounded-md overflow-hidden h-full flex flex-col">
        <ScrollArea className="flex-1">
          <div className="relative min-w-[600px] pb-12">
            {hours.map((hour) => {
              const timeLabel = `${hour.toString().padStart(2, '0')}:00`
              return (
                <div
                  key={hour}
                  className="group relative h-[64px] border-b border-border/50 flex cursor-pointer"
                  onClick={() => onSlotClick(timeLabel)}
                >
                  <div className="w-[60px] text-[11px] text-muted-foreground font-mono text-right pr-3 pt-1 shrink-0">
                    {timeLabel}
                  </div>
                  <div className="flex-1 relative border-l border-border/50 group-hover:bg-primary/3 transition-colors flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                </div>
              )
            })}

            {isToday && (
              <div
                className="absolute left-[60px] right-0 h-[2px] bg-destructive z-20 pointer-events-none"
                style={{ top: `${getTopPosition(currentTime)}px` }}
              >
                <div className="absolute -left-[4px] -top-[3px] w-2 h-2 rounded-full bg-destructive" />
              </div>
            )}

            {dayAppointments.map((app) => {
              const startD = new Date(app.datetime_start)
              const endD = new Date(app.datetime_end)
              const top = getTopPosition(startD)
              const height = ((endD.getTime() - startD.getTime()) / 60000 / 60) * 64
              const typeCfg = typeMap[app.type as keyof typeof typeMap] || typeMap.consultation

              return (
                <div
                  key={app.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAppointmentClick(app)
                  }}
                  className={cn(
                    'absolute left-[72px] right-[12px] rounded-lg p-[8px_12px] cursor-pointer transition-all duration-150 overflow-hidden border-l-[3px]',
                    typeCfg.class,
                    'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] z-10',
                  )}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '32px' }}
                >
                  <div className="text-[13px] font-medium text-foreground truncate leading-tight">
                    {app.patient_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(startD, 'HH:mm')} - {format(endD, 'HH:mm')}
                  </div>
                  <div className="text-[10px] font-medium mt-1 uppercase tracking-wide">
                    {typeCfg.label}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="hidden lg:flex bg-card border border-border rounded-md p-5 flex-col h-full overflow-hidden">
        <h3 className="text-[15px] font-semibold mb-4">Agendamentos de Hoje</h3>
        <p className="text-[12px] text-muted-foreground mb-4">
          {dayAppointments.length} agendamentos hoje
        </p>

        <ScrollArea className="flex-1 -mx-5 px-5">
          <div className="space-y-0">
            {dayAppointments.length === 0 ? (
              <div className="text-center pt-8 text-sm text-muted-foreground flex flex-col items-center">
                <p className="mb-4">Sua agenda está livre.</p>
                <Button variant="outline" size="sm" onClick={onNewAppointment}>
                  <Plus className="w-3 h-3 mr-2" /> Novo
                </Button>
              </div>
            ) : (
              dayAppointments.map((app, idx) => {
                const typeCfg = typeMap[app.type as keyof typeof typeMap] || typeMap.consultation
                const statCfg = statusMap[app.status as keyof typeof statusMap] || statusMap.pending
                return (
                  <div
                    key={app.id}
                    className={cn(
                      'py-[10px]',
                      idx < dayAppointments.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="text-[12px] font-semibold font-mono">
                      {format(new Date(app.datetime_start), 'HH:mm')}
                    </div>
                    <div className="text-[14px] font-medium mt-[2px]">{app.patient_name}</div>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={cn(
                          'text-[10px] px-[6px] py-[1px] rounded-full border-l-0 border border-transparent',
                          typeCfg.class,
                        )}
                      >
                        {typeCfg.label}
                      </span>
                      <span
                        className={cn('text-[10px] px-[6px] py-[1px] rounded-full', statCfg.class)}
                      >
                        {statCfg.label}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
