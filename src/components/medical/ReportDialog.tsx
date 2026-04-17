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
import { FileCheck, FileText, Forward, TestTube, MapPin, Tag, Loader2 } from 'lucide-react'
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
      <DialogContent className="max-w-none w-full h-[100dvh] sm:h-auto sm:max-w-[580px] p-0 sm:rounded-[var(--radius)] overflow-hidden flex flex-col sm:max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-[16px] font-bold flex items-center gap-2">
            <FileText className="h-[18px] w-[18px] text-primary" />
            {existingReport ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-[10px] px-6 py-4">
            {[
              { id: 'atestado', label: 'Atestado', sub: 'Afastamento', icon: FileCheck },
              { id: 'laudo', label: 'Laudo', sub: 'Relatorio medico', icon: FileText },
              {
                id: 'encaminhamento',
                label: 'Encaminhamento',
                sub: 'Outro especialista',
                icon: Forward,
              },
              {
                id: 'solicitacao_exames',
                label: 'Solicitacao de Exames',
                sub: 'Laboratorio/imagem',
                icon: TestTube,
              },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = reportType === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
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

          <div className="px-6 pb-6 space-y-4">
            {reportType === 'laudo' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                  Título do Laudo *
                </label>
                <Input
                  placeholder="Ex: Laudo Médico para Procedimento Estético"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-[38px] text-[13px]"
                />
              </div>
            )}

            {reportType === 'atestado' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px] block">
                    Dias de Afastamento
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={daysOff}
                      onChange={(e) => setDaysOff(e.target.value)}
                      className="h-[38px] w-[80px] text-[16px] font-bold text-center"
                    />
                    <span className="text-[13px] text-muted-foreground">dia(s)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                    CID-10 (Opcional)
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-[12px] h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Ex: J06.9"
                      value={cid10}
                      onChange={(e) => setCid10(e.target.value)}
                      className="h-[38px] text-[13px] pl-9 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {reportType === 'encaminhamento' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                  Encaminhar para
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-[12px] h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Ex: Ortopedista, Dr. Fulano"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="h-[38px] text-[13px] pl-9"
                  />
                </div>
              </div>
            )}

            {(reportType === 'laudo' ||
              reportType === 'encaminhamento' ||
              reportType === 'solicitacao_exames') && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                  CID-10 (Opcional)
                </label>
                <div className="relative w-full sm:w-[200px]">
                  <Tag className="absolute left-3 top-[12px] h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Ex: J06.9"
                    value={cid10}
                    onChange={(e) => setCid10(e.target.value)}
                    className="h-[38px] text-[13px] pl-9 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.3px]">
                {reportType === 'solicitacao_exames'
                  ? 'Exames Solicitados *'
                  : reportType === 'laudo'
                    ? 'Conteúdo do Laudo *'
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
                className="min-h-[160px] text-[13px] leading-[1.6] resize-y placeholder:text-muted-foreground/60"
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
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
