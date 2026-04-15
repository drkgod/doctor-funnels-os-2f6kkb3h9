import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { typeMap, statusMap } from './DayView'
import { cn } from '@/lib/utils'

interface AppointmentDrawerProps {
  appointment: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onConfirm: () => void
  onComplete: () => void
  onNoShow: () => void
  onCancel: () => void
}

export function AppointmentDrawer({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
}: AppointmentDrawerProps) {
  if (!appointment) return null

  const startD = new Date(appointment.datetime_start)
  const endD = new Date(appointment.datetime_end)
  const isPast = startD < new Date()

  const typeCfg = typeMap[appointment.type as keyof typeof typeMap] || typeMap.consultation
  const statCfg = statusMap[appointment.status as keyof typeof statusMap] || statusMap.pending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[400px] p-6 flex flex-col border-l">
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes</SheetTitle>
          <SheetDescription>Detalhes do agendamento</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <Link
            to={`/crm/patients/${appointment.patient_id}`}
            className="text-[20px] font-bold text-primary hover:underline"
          >
            {appointment.patient_name}
          </Link>

          <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground mt-2">
            <CalendarDays className="w-[14px] h-[14px]" />
            {format(startD, "dd/MM/yyyy 'das' HH:mm", { locale: ptBR })} às {format(endD, 'HH:mm')}
          </div>

          <div className="flex gap-2 mt-3">
            <span
              className={cn(
                'text-[10px] px-[6px] py-[1px] rounded-full border border-transparent',
                typeCfg.class,
              )}
            >
              {typeCfg.label}
            </span>
            <span className={cn('text-[10px] px-[6px] py-[1px] rounded-full', statCfg.class)}>
              {statCfg.label}
            </span>
          </div>

          <div className="mt-5">
            <h4 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Observações
            </h4>
            {appointment.notes ? (
              <div className="text-[14px] leading-[1.6] bg-secondary/30 p-[12px_16px] rounded-md whitespace-pre-wrap">
                {appointment.notes}
              </div>
            ) : (
              <div className="text-[14px] italic text-muted-foreground">Sem observações</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6 pt-5 border-t border-border">
          {appointment.status === 'pending' && (
            <Button
              onClick={onConfirm}
              variant="outline"
              className="h-10 text-[13px] font-medium border-success text-success hover:bg-success/10 w-full"
            >
              Confirmar
            </Button>
          )}
          {appointment.status === 'confirmed' && isPast && (
            <Button onClick={onComplete} className="h-10 text-[13px] font-medium w-full">
              Concluir
            </Button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'pending') && isPast && (
            <Button
              onClick={onNoShow}
              variant="outline"
              className="h-10 text-[13px] font-medium border-amber-500 text-amber-600 hover:bg-amber-500/10 w-full"
            >
              No-show
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onEdit}
            className="h-10 text-[13px] font-medium w-full"
          >
            Editar
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Tem certeza que deseja cancelar este agendamento?')) onCancel()
            }}
            className="h-10 text-[13px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
          >
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
