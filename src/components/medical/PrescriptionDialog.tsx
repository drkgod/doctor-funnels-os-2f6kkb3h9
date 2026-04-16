import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pill, ShieldAlert, Bug, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { prescriptionService } from '@/services/prescriptionService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format, addDays } from 'date-fns'

export function PrescriptionDialog({
  recordId,
  tenantId,
  doctorId,
  patientId,
  patientName,
  existingPrescription,
  onSaved,
  open,
  onOpenChange,
}: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('simple')
  const [medications, setMedications] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')

  useEffect(() => {
    if (open) {
      if (existingPrescription) {
        setType(existingPrescription.prescription_type || 'simple')
        setMedications(
          existingPrescription.medications?.map((m: any) => ({ ...m, expanded: false })) || [],
        )
        setNotes(existingPrescription.notes || existingPrescription.general_instructions || '')
        setValidUntil(existingPrescription.valid_until ? existingPrescription.valid_until : '')
      } else {
        setType('simple')
        setMedications([
          {
            name: '',
            dosage: '',
            frequency: '',
            duration: '',
            route: 'Via oral',
            instructions: '',
            quantity: '',
            expanded: true,
          },
        ])
        setNotes('')
        setValidUntil(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
      }
    }
  }, [open, existingPrescription])

  useEffect(() => {
    if (!existingPrescription && open) {
      const days = type === 'special_control' ? 60 : 30
      setValidUntil(format(addDays(new Date(), days), 'yyyy-MM-dd'))
    }
  }, [type])

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        route: 'Via oral',
        instructions: '',
        quantity: '',
        expanded: true,
      },
    ])
  }

  const handleRemoveMedication = (index: number) => {
    const newMeds = [...medications]
    newMeds.splice(index, 1)
    setMedications(newMeds)
  }

  const updateMedication = (index: number, field: string, value: string | boolean) => {
    const newMeds = [...medications]
    newMeds[index] = { ...newMeds[index], [field]: value }
    setMedications(newMeds)
  }

  const handleSave = async () => {
    if (medications.length === 0) {
      toast({ title: 'Adicione pelo menos um medicamento', variant: 'destructive' })
      return
    }
    const hasEmptyName = medications.some((m) => !m.name.trim())
    if (hasEmptyName) {
      toast({ title: 'Preencha o nome de todos os medicamentos', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const cleanMeds = medications.map((m) => {
        const { expanded, ...rest } = m
        return rest
      })

      const data = {
        type,
        medications: cleanMeds,
        notes,
        valid_until: validUntil || null,
      }

      if (existingPrescription) {
        await prescriptionService.updatePrescription(existingPrescription.id, data)
        toast({ title: 'Receita atualizada com sucesso' })
      } else {
        await prescriptionService.createPrescription(recordId, tenantId, doctorId, patientId, data)
        toast({ title: 'Receita criada com sucesso' })
      }

      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro ao salvar receita', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{existingPrescription ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
          <DialogDescription className="sr-only">
            Crie ou edite a receita médica do paciente {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'simple', label: 'Receita Simples', icon: Pill },
              { id: 'special_control', label: 'Controle Especial', icon: ShieldAlert },
              { id: 'antimicrobial', label: 'Antimicrobiano', icon: Bug },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = type === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-colors gap-2 text-center',
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'hover:bg-secondary border-border',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[12px] font-medium leading-tight">{t.label}</span>
                </div>
              )
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[14px] font-semibold flex items-center gap-2">
                Medicamentos
                <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[11px]">
                  {medications.length}
                </span>
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleAddMedication}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={index} className="border border-border rounded-md overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 bg-secondary/30 cursor-pointer hover:bg-secondary/50"
                    onClick={() => updateMedication(index, 'expanded', !med.expanded)}
                  >
                    <div className="flex items-center gap-2 font-medium text-[13px]">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      {med.name || (
                        <span className="text-muted-foreground italic">Novo medicamento</span>
                      )}
                      {med.dosage && (
                        <span className="text-muted-foreground font-normal">- {med.dosage}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMedication(index)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {med.expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {med.expanded && (
                    <div className="p-4 bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Medicamento *
                        </label>
                        <Input
                          placeholder="Nome do medicamento"
                          value={med.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Dosagem
                        </label>
                        <Input
                          placeholder="Ex: 500mg"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Posologia
                        </label>
                        <Input
                          placeholder="Ex: 8 em 8 horas"
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Duração
                        </label>
                        <Input
                          placeholder="Ex: 7 dias"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">Via</label>
                        <Select
                          value={med.route}
                          onValueChange={(v) => updateMedication(index, 'route', v)}
                        >
                          <SelectTrigger className="h-9 text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              'Via oral',
                              'Sublingual',
                              'Intramuscular',
                              'Intravenosa',
                              'Tópica',
                              'Oftálmica',
                              'Inalatória',
                              'Retal',
                            ].map((o) => (
                              <SelectItem key={o} value={o} className="text-[13px]">
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Quantidade
                        </label>
                        <Input
                          placeholder="Ex: 21 comprimidos"
                          value={med.quantity}
                          onChange={(e) => updateMedication(index, 'quantity', e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Instruções
                        </label>
                        <Textarea
                          placeholder="Ex: Tomar após as refeições. Não ingerir com álcool."
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          className="min-h-[60px] text-[13px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-muted-foreground">
                Validade da Receita
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[12px] font-medium text-muted-foreground">
                Observações Gerais
              </label>
              <Textarea
                placeholder="Instruções adicionais para o paciente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-[13px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-secondary/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Receita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
