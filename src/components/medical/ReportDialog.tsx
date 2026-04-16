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
import { FileCheck, FileText, Forward, TestTube } from 'lucide-react'
import { medicalReportService } from '@/services/medicalReportService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function ReportDialog({
  recordId,
  tenantId,
  doctorId,
  patientId,
  patientName,
  existingReport,
  onSaved,
  open,
  onOpenChange,
  defaultType = 'laudo',
}: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState(defaultType)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [cid10, setCid10] = useState('')
  const [daysOff, setDaysOff] = useState('1')
  const [destination, setDestination] = useState('')

  useEffect(() => {
    if (open) {
      if (existingReport) {
        setReportType(existingReport.report_type || 'laudo')
        setTitle(existingReport.title || '')
        setContent(existingReport.content || '')
        setCid10(existingReport.metadata?.cid10 || '')
        setDaysOff(existingReport.metadata?.days_off?.toString() || '1')
        setDestination(existingReport.metadata?.destination || '')
      } else {
        setReportType(defaultType)
        applyTemplate(defaultType)
      }
    }
  }, [open, existingReport, defaultType])

  const applyTemplate = (type: string) => {
    setCid10('')
    setDaysOff('1')
    setDestination('')

    if (type === 'atestado') {
      setTitle('Atestado Médico')
      setContent(
        `Atesto para os devidos fins que o(a) paciente ${patientName || '______________'}, compareceu à consulta médica nesta data, necessitando de 1 dia(s) de afastamento de suas atividades.`,
      )
    } else if (type === 'laudo') {
      setTitle('')
      setContent('')
    } else if (type === 'encaminhamento') {
      setTitle('Encaminhamento Médico')
      setContent(
        `Encaminho o(a) paciente ${patientName || '______________'} para avaliação de [ESPECIALIDADE]. Motivo: `,
      )
    } else if (type === 'solicitacao_exames') {
      setTitle('Solicitação de Exames')
      setContent('Exames Solicitados:\n- ')
    }
  }

  const handleTypeChange = (t: string) => {
    if (existingReport && existingReport.report_type !== t) {
      if (!confirm('Mudar o tipo de documento apagará o conteúdo atual. Deseja continuar?')) return
    } else if (content.length > 50 && !existingReport) {
      if (!confirm('Mudar o tipo de documento aplicará um novo template. Deseja continuar?')) return
    }
    setReportType(t)
    if (!existingReport || existingReport.report_type !== t) {
      applyTemplate(t)
    }
  }

  useEffect(() => {
    if (reportType === 'atestado' && !existingReport) {
      setContent(
        `Atesto para os devidos fins que o(a) paciente ${patientName || '______________'}, compareceu à consulta médica nesta data, necessitando de ${daysOff} dia(s) de afastamento de suas atividades.`,
      )
    }
  }, [daysOff])

  const handleSave = async () => {
    if (!title.trim() && reportType === 'laudo') {
      toast({ title: 'Preencha o título do laudo', variant: 'destructive' })
      return
    }
    if (!content.trim()) {
      toast({ title: 'Preencha o conteúdo do documento', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const data = {
        report_type: reportType,
        title:
          title ||
          (reportType === 'atestado'
            ? 'Atestado Médico'
            : reportType === 'encaminhamento'
              ? 'Encaminhamento Médico'
              : 'Solicitação de Exames'),
        content,
        cid10: cid10 || null,
        days_off: reportType === 'atestado' ? parseInt(daysOff) : null,
        destination: reportType === 'encaminhamento' ? destination : null,
      }

      if (existingReport) {
        await medicalReportService.updateReport(existingReport.id, data)
        toast({ title: 'Documento atualizado com sucesso' })
      } else {
        await medicalReportService.createReport(recordId, tenantId, doctorId, patientId, data)
        toast({ title: 'Documento criado com sucesso' })
      }

      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro ao salvar documento', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{existingReport ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          <DialogDescription className="sr-only">
            Crie ou edite o documento do paciente {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'atestado', label: 'Atestado Médico', icon: FileCheck },
              { id: 'laudo', label: 'Laudo Médico', icon: FileText },
              { id: 'encaminhamento', label: 'Encaminhamento', icon: Forward },
              { id: 'solicitacao_exames', label: 'Exames', icon: TestTube },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = reportType === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
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

          <div className="space-y-4">
            {reportType === 'laudo' && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">
                  Título do Laudo *
                </label>
                <Input
                  placeholder="Ex: Laudo Médico para Procedimento Estético"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}

            {reportType === 'atestado' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">
                    Dias de Afastamento
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={daysOff}
                    onChange={(e) => setDaysOff(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-muted-foreground">
                    CID-10 (Opcional)
                  </label>
                  <Input
                    placeholder="Ex: J06.9"
                    value={cid10}
                    onChange={(e) => setCid10(e.target.value)}
                  />
                </div>
              </div>
            )}

            {reportType === 'encaminhamento' && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">
                  Encaminhar para
                </label>
                <Input
                  placeholder="Ex: Ortopedista, Dr. Fulano"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            )}

            {(reportType === 'laudo' ||
              reportType === 'encaminhamento' ||
              reportType === 'solicitacao_exames') && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">
                  CID-10 (Opcional)
                </label>
                <Input
                  placeholder="Ex: J06.9"
                  value={cid10}
                  onChange={(e) => setCid10(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">
                {reportType === 'solicitacao_exames'
                  ? 'Exames Solicitados *'
                  : 'Conteúdo do Documento *'}
              </label>
              <Textarea
                placeholder={
                  reportType === 'solicitacao_exames'
                    ? 'Liste os exames, um por linha. Ex:\n- Hemograma completo\n- Glicemia de jejum'
                    : 'Digite o conteúdo...'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[250px] text-[14px] leading-relaxed resize-y"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-secondary/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
