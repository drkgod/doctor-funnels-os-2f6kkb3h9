import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { emailService, EmailTemplate, EmailCampaign } from '@/services/emailService'
import { toast } from 'sonner'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign?: EmailCampaign
  tenantId: string
  onSaved: () => void
}

export function CampaignDialog({ open, onOpenChange, campaign, tenantId, onSaved }: Props) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])

  const [stages, setStages] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [schedule, setSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  const [estimate, setEstimate] = useState<number | null>(null)
  const [estimating, setEstimating] = useState(false)

  useEffect(() => {
    emailService.fetchTemplates(tenantId).then(setTemplates)
  }, [tenantId])

  useEffect(() => {
    if (campaign) {
      setName(campaign.name)
      setTemplateId(campaign.template_id)
      const filters = (campaign.segment_filter as any) || {}
      setStages(filters.pipeline_stage || [])
      setSources(filters.source || [])
      setTags(filters.tags || [])
      if (campaign.scheduled_at) {
        setSchedule(true)
        setScheduledAt(new Date(campaign.scheduled_at).toISOString().slice(0, 16))
      }
    } else {
      setName('')
      setTemplateId('')
      setStages([])
      setSources([])
      setTags([])
      setSchedule(false)
      setScheduledAt('')
    }
  }, [campaign, open])

  useEffect(() => {
    if (!open) return
    const fetchEstimate = async () => {
      setEstimating(true)
      try {
        const filters: any = {}
        if (stages.length > 0) filters.pipeline_stage = stages
        if (sources.length > 0) filters.source = sources
        if (tags.length > 0) filters.tags = tags
        const count = await emailService.fetchRecipientEstimate(tenantId, filters)
        setEstimate(count)
      } catch (err) {
        setEstimate(null)
      } finally {
        setEstimating(false)
      }
    }
    const timeoutId = setTimeout(fetchEstimate, 500)
    return () => clearTimeout(timeoutId)
  }, [stages, sources, tags, tenantId, open])

  const handleStageToggle = (s: string) => {
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const handleSourceToggle = (s: string) => {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  const selectedTemplate = templates.find((t) => t.id === templateId)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (stages.length > 0) filters.pipeline_stage = stages
      if (sources.length > 0) filters.source = sources
      if (tags.length > 0) filters.tags = tags

      const data = {
        name,
        template_id: templateId,
        segment_filter: Object.keys(filters).length > 0 ? filters : null,
        scheduled_at: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }

      if (campaign) {
        await emailService.updateCampaign(campaign.id, data)
        toast.success('Campanha atualizada')
      } else {
        await emailService.createCampaign(tenantId, data)
        toast.success('Campanha criada')
      }
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label>Nome da campanha *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <div className="mt-2 border rounded-md p-2 bg-muted/10 h-24 overflow-hidden text-xs relative">
                <div
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
                  className="scale-75 origin-top-left w-[133%]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
              </div>
            )}
          </div>

          <Collapsible className="border rounded-md bg-card">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-medium">
              Segmentar pacientes (opcional) <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estágio do Funil</Label>
                  {['lead', 'contato', 'agendado', 'consulta', 'retorno', 'procedimento'].map(
                    (s) => (
                      <div key={s} className="flex items-center space-x-2">
                        <Checkbox
                          id={`st-${s}`}
                          checked={stages.includes(s)}
                          onCheckedChange={() => handleStageToggle(s)}
                        />
                        <label htmlFor={`st-${s}`} className="text-sm capitalize">
                          {s}
                        </label>
                      </div>
                    ),
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  {['whatsapp', 'formulario', 'telefone', 'indicacao', 'manual'].map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`so-${s}`}
                        checked={sources.includes(s)}
                        onCheckedChange={() => handleSourceToggle(s)}
                      />
                      <label htmlFor={`so-${s}`} className="text-sm capitalize">
                        {s}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Tags (Pressione Enter para adicionar)
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1"
                    >
                      {t}{' '}
                      <button
                        onClick={() => removeTag(t)}
                        className="hover:text-destructive text-muted-foreground"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagAdd}
                  placeholder="Adicionar tag..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {estimating && <Loader2 className="h-3 w-3 animate-spin" />}
            Aproximadamente {estimate !== null ? estimate : '...'} destinatários
          </div>

          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Agendar envio</Label>
              <Switch checked={schedule} onCheckedChange={setSchedule} />
            </div>
            {schedule && (
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {campaign ? 'Salvar' : 'Criar Campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
