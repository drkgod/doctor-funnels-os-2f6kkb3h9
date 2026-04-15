import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { patientService } from '@/services/patientService'
import { useToast } from '@/hooks/use-toast'

interface Props {
  patientsByStage: Record<string, any[]>
  onMoveOptimistic: (id: string, from: string, to: string) => void
  onMoveRevert: (id: string, from: string, to: string) => void
}

const STAGES = [
  { id: 'lead', title: 'Lead' },
  { id: 'contact', title: 'Contato' },
  { id: 'scheduled', title: 'Agendado' },
  { id: 'consultation', title: 'Consulta' },
  { id: 'return', title: 'Retorno' },
  { id: 'procedure', title: 'Procedimento' },
]

const SOURCE_COLORS: Record<string, string> = {
  WhatsApp: 'bg-green-500/10 text-green-600',
  Formulario: 'bg-blue-500/10 text-blue-600',
  Telefone: 'bg-amber-500/10 text-amber-600',
  Indicacao: 'bg-purple-500/10 text-purple-600',
  Doctoralia: 'bg-teal-500/10 text-teal-600',
  Manual: 'bg-gray-500/10 text-gray-600',
}

export function KanbanBoard({ patientsByStage, onMoveOptimistic, onMoveRevert }: Props) {
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleDragStart = (e: React.DragEvent, id: string, stage: string) => {
    e.dataTransfer.setData('id', id)
    e.dataTransfer.setData('stage', stage)
  }

  const handleDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('id')
    const fromStage = e.dataTransfer.getData('stage')
    if (fromStage === toStage) return

    onMoveOptimistic(id, fromStage, toStage)
    try {
      await patientService.movePatient(id, toStage)
    } catch (err) {
      onMoveRevert(id, toStage, fromStage)
      toast({
        title: 'Erro ao mover',
        description: 'Não foi possível mover o paciente. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto pb-4 items-start">
      {STAGES.map((stage) => (
        <div
          key={stage.id}
          className="flex-shrink-0 w-[300px] flex flex-col bg-secondary/30 rounded-xl border p-3 h-full max-h-[calc(100vh-200px)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, stage.id)}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              {stage.title}
            </h3>
            <Badge variant="secondary" className="rounded-full">
              {patientsByStage[stage.id]?.length || 0}
            </Badge>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2">
            {patientsByStage[stage.id]?.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id, stage.id)}
                onClick={() => navigate(`/crm/patients/${p.id}`)}
                className="bg-card p-4 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
              >
                <div className="font-medium text-sm text-foreground">{p.full_name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p.phone || 'Sem telefone'}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] border-none ${SOURCE_COLORS[p.source] || SOURCE_COLORS['Manual']}`}
                  >
                    {p.source}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      há {formatDistanceToNow(new Date(p.updated_at), { locale: ptBR })}
                    </span>
                    {p.assigned?.full_name && (
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px]">
                          {p.assigned.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
