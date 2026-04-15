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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { patientService, type Patient } from '@/services/patientService'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  tenantId: string
  initialStage?: string
  patient?: any
  onSuccess: (p: Patient) => void
}

export function maskPhone(v: string) {
  let r = v.replace(/\D/g, '')
  if (r.length > 11) r = r.slice(0, 11)
  if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  if (r.length > 5) return r.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  if (r.length > 2) return r.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  return r
}

export function maskCpf(v: string) {
  let r = v.replace(/\D/g, '')
  if (r.length > 11) r = r.slice(0, 11)
  return r
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    .replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    .replace(/(\d{3})(\d{1,3})/, '$1.$2')
}

export function PatientDialog({
  open,
  onOpenChange,
  tenantId,
  initialStage,
  patient,
  onSuccess,
}: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [formData, setFormData] = useState<Partial<Patient>>({
    full_name: '',
    phone: '',
    email: '',
    cpf: '',
    date_of_birth: '',
    gender: '',
    address: '',
    source: 'Manual',
    pipeline_stage: initialStage || 'lead',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      setTags(patient?.tags || [])
      setFormData({
        full_name: patient?.full_name || '',
        phone: patient?.phone || '',
        email: patient?.email || '',
        cpf: patient?.cpf || '',
        date_of_birth: patient?.date_of_birth || '',
        gender: patient?.gender || '',
        address: patient?.address || '',
        source: patient?.source || 'Manual',
        pipeline_stage: patient?.pipeline_stage || initialStage || 'lead',
        notes: patient?.notes || '',
      })
    }
  }, [open, patient, initialStage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name)
      return toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' })
    try {
      setLoading(true)
      const dataToSave = { ...formData, tags }
      let saved
      if (patient) saved = await patientService.updatePatient(patient.id, dataToSave)
      else saved = await patientService.createPatient(tenantId, dataToSave)
      toast({ title: patient ? 'Paciente atualizado' : 'Paciente criado com sucesso' })
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (val && tags.length < 10 && !tags.includes(val)) {
        setTags([...tags, val])
        e.currentTarget.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Nome completo *</Label>
            <Input
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome do paciente"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@paciente.com"
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: maskCpf(e.target.value) })}
              placeholder="123.456.789-00"
            />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>
          <div>
            <Label>Gênero</Label>
            <Select
              value={formData.gender}
              onValueChange={(v) => setFormData({ ...formData, gender: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem</Label>
            <Select
              value={formData.source}
              onValueChange={(v) => setFormData({ ...formData, source: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Formulario">Formulário</SelectItem>
                <SelectItem value="Telefone">Telefone</SelectItem>
                <SelectItem value="Indicacao">Indicação</SelectItem>
                <SelectItem value="Doctoralia">Doctoralia</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Endereço</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>
          <div className="col-span-2">
            <Label>Estágio inicial</Label>
            <Select
              value={formData.pipeline_stage}
              onValueChange={(v) => setFormData({ ...formData, pipeline_stage: v })}
              disabled={!!patient}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="contact">Contato</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="consultation">Consulta</SelectItem>
                <SelectItem value="return">Retorno</SelectItem>
                <SelectItem value="procedure">Procedimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Tags (pressione Enter)</Label>
            <Input onKeyDown={handleAddTag} placeholder="Adicionar tag..." />
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}{' '}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                  />
                </Badge>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              maxLength={500}
            />
          </div>
          <DialogFooter className="col-span-2 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : patient ? 'Salvar' : 'Criar Paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
