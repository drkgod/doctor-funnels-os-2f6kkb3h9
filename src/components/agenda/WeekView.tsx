import { format, isSameDay, addDays, startOfWeek, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Appointment } from '@/services/appointmentService'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
import { useState, useEffect, TouchEvent } from 'react'
import { cn } from '@/lib/utils'
import { typeMap } from './DayView'
import { CalendarDays } from 'lucide-react'

interface WeekViewProps {
  currentDate: Date
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  onSlotClick: (date: Date) => void
}

export function WeekView({
  currentDate,
  appointments,
  onAppointmentClick,
  onSlotClick,
}: WeekViewProps) {
  const isMobile = useIsMobile()
  const [mobileOffset, setMobileOffset] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  useEffect(() => {
    setMobileOffset(0)
  }, [currentDate])

  const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday

  let visibleDays = 7
  let days: Date[] = []

  if (isMobile) {
    visibleDays = 3
    const baseDate = addDays(currentDate, mobileOffset)
    days = [subDays(baseDate, 1), baseDate, addDays(baseDate, 1)]
  } else {
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const handleTouchStart = (e: TouchEvent) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return
    const touchEnd = e.changedTouches[0].clientX
    if (touchStart - touchEnd > 50) setMobileOffset((prev) => prev + 3)
    if (touchEnd - touchStart > 50) setMobileOffset((prev) => prev - 3)
    setTouchStart(null)
  }

  return (
    <div
      className="bg-card border border-border rounded-md overflow-hidden h-full flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `repeat(${visibleDays}, 1fr)` }}
      >
        {days.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'p-[12px_8px] text-center',
                idx < visibleDays - 1 && 'border-r border-border/50',
                isToday && 'bg-primary/5',
              )}
            >
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                {format(day, 'E', { locale: ptBR })}
              </div>
              <div className="flex justify-center mt-[2px]">
                <div
                  className={cn(
                    'text-[16px] font-semibold flex items-center justify-center',
                    isToday && 'text-primary w-[28px] h-[28px] bg-primary/15 rounded-full',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ScrollArea className="flex-1">
        <div
          className="grid min-h-[400px]"
          style={{ gridTemplateColumns: `repeat(${visibleDays}, 1fr)` }}
        >
          {days.map((day, idx) => {
            const dayApps = appointments
              .filter((a) => isSameDay(new Date(a.datetime_start), day))
              .sort(
                (a, b) =>
                  new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime(),
              )

            return (
              <div
                key={day.toISOString()}
                className={cn('p-[8px]', idx < visibleDays - 1 && 'border-r border-border/50')}
                onClick={() => onSlotClick(day)}
              >
                {dayApps.map((app) => {
                  const typeCfg = typeMap[app.type as keyof typeof typeMap] || typeMap.consultation
                  return (
                    <div
                      key={app.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(app)
                      }}
                      className={cn(
                        'p-[6px_8px] rounded-[6px] mb-1 cursor-pointer transition-all duration-150 border-l-[3px]',
                        typeCfg.class,
                        'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]',
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', typeCfg.dot)} />
                        {format(new Date(app.datetime_start), 'HH:mm')}
                        {app.type === 'google_calendar' && (
                          <CalendarDays className="w-3 h-3 ml-auto text-muted-foreground opacity-50 shrink-0" />
                        )}
                      </div>
                      <div className="text-[12px] font-medium text-foreground truncate mt-0.5">
                        {app.patient_name}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
