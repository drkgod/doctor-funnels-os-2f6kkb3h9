import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Pill, ShieldAlert, Bug, Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react'
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
      const days = type === 'special_control' ? 60 : type === 'antimicrobial' ? 10 : 30
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
      <DialogContent className="max-w-none w-full h-[100dvh] sm:h-auto sm:max-w-[640px] p-0 sm:rounded-[var(--radius)] overflow-hidden flex flex-col sm:max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-[16px] font-bold flex items-center gap-2">
            <Pill className="h-[18px] w-[18px] text-primary" />
            {existingPrescription ? 'Editar Receita' : 'Nova Receita'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 flex flex-col">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-[10px] px-6 py-4">
            {[
              { id: 'simple', label: 'Receita Simples', sub: 'Branca comum', icon: Pill },
              {
                id: 'special_control',
                label: 'Controle Especial',
                sub: 'Azul (B1/B2)',
                icon: ShieldAlert,
              },
              { id: 'antimicrobial', label: 'Antimicrobiano', sub: 'Validade 10 dias', icon: Bug },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = type === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    'p-3.5 border rounded-[var(--radius)] text-center cursor-pointer transition-all duration-150',
                    isSelected
                      ? 'border-primary border-2 bg-primary/5'
                      : 'border-border hover:border-primary/30',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6 mx-auto',
                      isSelected ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="text-[12px] font-semibold mt-1.5">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</div>
                </div>
              )
            })}
          </div>

          <div className="px-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-[13px] font-bold">Medicamentos</h4>
              <span className="text-[11px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {medications.length}
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full h-10 border-2 border-dashed border-border/50 rounded-[var(--radius)] text-[13px] text-muted-foreground gap-1.5 mb-3 hover:border-primary/40 hover:text-primary hover:bg-primary/3 transition-all duration-150"
              onClick={handleAddMedication}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Medicamento
            </Button>

            <div className="space-y-2.5">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="border border-border rounded-[var(--radius)] overflow-hidden transition-all duration-150"
                >
                  <div
                    className="p-3 px-4 flex items-center justify-between cursor-pointer"
                    onClick={() => updateMedication(index, 'expanded', !med.expanded)}
                  >
                    <div className="flex items-center gap-2 truncate pr-4">
                      {med.name ? (
                        <span className="text-[14px] font-medium text-foreground truncate">
                          {med.name}
                        </span>
                      ) : (
                        <span className="text-[14px] font-medium italic text-muted-foreground">
                          Medicamento sem nome
                        </span>
                      )}
                      {med.dosage && (
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                          • {med.dosage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMedication(index)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                          med.expanded && 'rotate-180',
                        )}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200 ease-in-out',
                      med.expanded
                        ? 'max-h-[500px] opacity-100 border-t border-primary/30'
                        : 'max-h-0 opacity-0 border-t-0',
                    )}
                  >
                    <div className="p-4 bg-secondary/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Medicamento *
                        </label>
                        <Input
                          placeholder="Nome do medicamento"
                          value={med.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          className="h-[38px] text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Dosagem
                        </label>
                        <Input
                          placeholder="Ex: 500mg"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          className="h-[38px] text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Posologia
                        </label>
                        <Input
                          placeholder="Ex: 8 em 8 horas"
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="h-[38px] text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Duração
                        </label>
                        <Input
                          placeholder="Ex: 7 dias"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          className="h-[38px] text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Via
                        </label>
                        <Select
                          value={med.route}
                          onValueChange={(v) => updateMedication(index, 'route', v)}
                        >
                          <SelectTrigger className="h-[38px] text-[13px]">
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
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                          Quantidade
                        </label>
                        <Input
                          placeholder="Ex: 21 comprimidos"
                          value={med.quantity}
                          onChange={(e) => updateMedication(index, 'quantity', e.target.value)}
                          className="h-[38px] text-[13px]"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 mt-2">
            <div className="space-y-1 mb-4">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                Observações Gerais
              </label>
              <Textarea
                placeholder="Instruções adicionais para o paciente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                Validade da Receita
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-[38px] text-[13px] w-full sm:w-[200px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex justify-end gap-2.5 sm:gap-2">
          <Button
            variant="outline"
            className="h-[38px] text-[13px] w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="h-[38px] text-[13px] font-semibold w-full sm:w-auto"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar Receita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
