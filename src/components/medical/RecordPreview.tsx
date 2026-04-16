import { format } from 'date-fns'
import { Printer, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface RecordPreviewProps {
  record: any
  patient: any
  doctor: any
  tenant: any
  specialtyTemplate: any
  bodyMaps: any[]
  transcription: any
  isLoading?: boolean
  error?: string
}

export function RecordPreview({
  record,
  patient,
  doctor,
  tenant,
  specialtyTemplate,
  bodyMaps,
  transcription,
  isLoading,
  error,
}: RecordPreviewProps) {
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center h-full">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium text-foreground">Erro ao carregar prontuário</h3>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  const sections = record?.sections || []
  const rec = record?.record || {}

  const hasContent = sections.some(
    (s: any) =>
      s.content?.trim() || (s.structured_data && Object.keys(s.structured_data).length > 0),
  )

  if (!hasContent) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center h-full bg-white">
        <div className="text-muted-foreground mb-4 text-4xl">📄</div>
        <p className="text-foreground font-medium text-lg">Prontuário vazio.</p>
        <p className="text-sm text-muted-foreground">Preencha os campos ou grave uma consulta.</p>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const subjective = sections.find((s: any) => s.section_type === 'subjective') || {}
  const objective = sections.find((s: any) => s.section_type === 'objective') || {}
  const assessment = sections.find((s: any) => s.section_type === 'assessment') || {}
  const plan = sections.find((s: any) => s.section_type === 'plan') || {}
  const vitalSigns = sections.find((s: any) => s.section_type === 'vital_signs') || {}
  const vsData = vitalSigns.structured_data || {}
  const specialtyFields = sections.find((s: any) => s.section_type === 'specialty_fields') || {}
  const spData = specialtyFields.structured_data || {}

  return (
    <div className="relative bg-white text-black min-h-full w-full">
      <style>{`
        @media print {
          @page { margin: 20mm; }
          body * { visibility: hidden; }
          #preview-dialog-content { overflow: visible !important; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; font-family: serif; font-size: 11pt; color: #000; background: #fff; }
          .no-print { display: none !important; }
          .print-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="sticky top-0 right-0 p-4 bg-white/80 backdrop-blur flex justify-end border-b border-gray-200 z-10 no-print">
        <Button onClick={handlePrint} className="gap-2 shadow-sm">
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div
        id="print-area"
        className="max-w-[800px] mx-auto p-8 font-serif text-[11pt] leading-relaxed bg-white"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {tenant?.logo_url && <img src={tenant.logo_url} alt="Logo" className="max-h-12" />}
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {tenant?.name || 'Clínica'}
            </h1>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">PRONTUÁRIO MÉDICO</h2>
            <div className="text-xs font-bold mt-1 uppercase border border-black inline-block px-2 py-0.5 tracking-wider">
              {rec.record_type || 'Consulta'}
            </div>
            <div className="text-sm mt-1">
              Data: {format(new Date(rec.created_at || new Date()), 'dd/MM/yyyy')}
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="border border-black p-4 mb-4 print-section bg-gray-50/50">
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <strong className="font-semibold text-gray-700">Nome Completo:</strong>{' '}
              {patient?.full_name}
            </div>
            <div>
              <strong className="font-semibold text-gray-700">Telefone:</strong>{' '}
              {patient?.phone || 'Não informado'}
            </div>
            <div>
              <strong className="font-semibold text-gray-700">Email:</strong>{' '}
              {patient?.email || 'Não informado'}
            </div>
            <div>
              <strong className="font-semibold text-gray-700">CPF:</strong>{' '}
              {patient?.cpf || 'Não informado'}
            </div>
          </div>
        </div>

        {rec.chief_complaint && (
          <div className="mb-4 print-section">
            <strong className="font-semibold text-gray-700">Queixa Principal:</strong>{' '}
            {rec.chief_complaint}
          </div>
        )}

        <div className="mb-8 pb-4 border-b border-gray-300 print-section">
          <strong className="font-semibold text-gray-700">Profissional:</strong> Dr(a).{' '}
          {doctor?.full_name} - {doctor?.specialty} - CRM {doctor?.crm_number || 'não informado'}/
          {doctor?.crm_state || ''}
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* S */}
          <div className="print-section">
            <h3 className="font-bold text-base mb-2 uppercase tracking-wide">
              ANAMNESE (S){' '}
              {subjective.ai_generated && (
                <span className="text-xs font-normal normal-case italic text-gray-500 ml-2">
                  (Gerado por IA)
                </span>
              )}
            </h3>
            <p className="whitespace-pre-wrap">
              {subjective.content || <span className="italic text-gray-400">Não preenchido</span>}
            </p>
          </div>

          {/* Vital Signs */}
          {Object.keys(vsData).length > 0 && (
            <div className="print-section mt-4 bg-gray-50 p-4 rounded border border-gray-200">
              <h4 className="font-bold text-sm mb-3 tracking-wide">SINAIS VITAIS</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {vsData.pa_sistolica && vsData.pa_diastolica && (
                  <div>
                    <strong className="text-gray-600">PA:</strong> {vsData.pa_sistolica}x
                    {vsData.pa_diastolica} mmHg
                  </div>
                )}
                {vsData.fc && (
                  <div>
                    <strong className="text-gray-600">FC:</strong> {vsData.fc} bpm
                  </div>
                )}
                {vsData.fr && (
                  <div>
                    <strong className="text-gray-600">FR:</strong> {vsData.fr} irpm
                  </div>
                )}
                {vsData.temp && (
                  <div>
                    <strong className="text-gray-600">Tax:</strong> {vsData.temp} °C
                  </div>
                )}
                {vsData.spo2 && (
                  <div>
                    <strong className="text-gray-600">SpO2:</strong> {vsData.spo2} %
                  </div>
                )}
                {vsData.peso && (
                  <div>
                    <strong className="text-gray-600">Peso:</strong> {vsData.peso} kg
                  </div>
                )}
                {vsData.altura && (
                  <div>
                    <strong className="text-gray-600">Altura:</strong> {vsData.altura} cm
                  </div>
                )}
                {vsData.imc && (
                  <div>
                    <strong className="text-gray-600">IMC:</strong> {vsData.imc} ({vsData.imc_class}
                    )
                  </div>
                )}
              </div>
            </div>
          )}

          {/* O */}
          <div className="print-section">
            <h3 className="font-bold text-base mb-2 uppercase tracking-wide">
              EXAME FÍSICO (O){' '}
              {objective.ai_generated && (
                <span className="text-xs font-normal normal-case italic text-gray-500 ml-2">
                  (Gerado por IA)
                </span>
              )}
            </h3>
            <p className="whitespace-pre-wrap">
              {objective.content || <span className="italic text-gray-400">Não preenchido</span>}
            </p>
          </div>

          {/* Specialty Fields */}
          {specialtyTemplate &&
            specialtyTemplate.sections?.length > 0 &&
            Object.keys(spData).length > 0 && (
              <div className="print-section border border-gray-300 p-5 bg-gray-50/30">
                <h3 className="font-bold text-base mb-4 uppercase tracking-wide">
                  {specialtyTemplate.template_name}
                </h3>
                {Array.from(new Set(specialtyTemplate.sections.map((s: any) => s.category))).map(
                  (cat: any) => {
                    const fields = specialtyTemplate.sections.filter(
                      (s: any) =>
                        s.category === cat &&
                        s.type !== 'body_map' &&
                        spData[s.key] !== undefined &&
                        spData[s.key] !== '',
                    )
                    if (fields.length === 0) return null
                    return (
                      <div key={cat} className="mb-5 last:mb-0">
                        <h4 className="font-bold text-sm uppercase mb-2 border-b border-gray-200 pb-1 tracking-wider text-gray-600">
                          {cat}
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          {fields.map((f: any) => {
                            const val = spData[f.key]
                            let displayVal = val
                            if (Array.isArray(val)) displayVal = val.join(', ')
                            if (typeof val === 'boolean') displayVal = val ? 'Sim' : 'Não'
                            return (
                              <div key={f.key}>
                                <strong className="text-gray-700">{f.label}:</strong> {displayVal}{' '}
                                {f.unit || ''}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}

          {/* Body Maps */}
          {bodyMaps && bodyMaps.length > 0 && (
            <div className="print-section mt-4">
              <h3 className="font-bold text-base mb-3 uppercase tracking-wide">MAPA CORPORAL</h3>
              <div className="space-y-4">
                {bodyMaps.map((bm: any) => (
                  <div key={bm.id} className="border border-gray-300 p-4 bg-gray-50/30">
                    <div className="font-bold text-sm mb-3 text-gray-700 uppercase tracking-wider">
                      {bm.map_type}
                    </div>
                    {bm.points && bm.points.length > 0 ? (
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-gray-300 text-gray-600">
                            <th className="py-2 font-semibold">Ponto</th>
                            <th className="py-2 font-semibold">Descrição</th>
                            <th className="py-2 font-semibold">Produto</th>
                            <th className="py-2 font-semibold">Unidades</th>
                            <th className="py-2 font-semibold">Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bm.points.map((p: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 last:border-0">
                              <td className="py-2 font-medium">{idx + 1}</td>
                              <td className="py-2">{p.label || '-'}</td>
                              <td className="py-2">{p.product || '-'}</td>
                              <td className="py-2">{p.units || '-'}</td>
                              <td className="py-2">{p.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-sm italic text-gray-400 py-2">Sem pontos marcados.</div>
                    )}
                    {bm.notes && (
                      <div className="mt-3 text-sm pt-2 border-t border-gray-200">
                        <strong className="text-gray-600">Notas:</strong> {bm.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A */}
          <div className="print-section">
            <h3 className="font-bold text-base mb-2 uppercase tracking-wide">
              AVALIAÇÃO (A){' '}
              {assessment.ai_generated && (
                <span className="text-xs font-normal normal-case italic text-gray-500 ml-2">
                  (Gerado por IA)
                </span>
              )}
            </h3>
            <p className="whitespace-pre-wrap">
              {assessment.content || <span className="italic text-gray-400">Não preenchido</span>}
            </p>
            {assessment.structured_data?.cid10?.length > 0 && (
              <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <strong className="text-gray-700">CID-10:</strong>{' '}
                {assessment.structured_data.cid10.join(', ')}
              </div>
            )}
          </div>

          {/* P */}
          <div className="print-section">
            <h3 className="font-bold text-base mb-2 uppercase tracking-wide">
              CONDUTA (P){' '}
              {plan.ai_generated && (
                <span className="text-xs font-normal normal-case italic text-gray-500 ml-2">
                  (Gerado por IA)
                </span>
              )}
            </h3>
            <p className="whitespace-pre-wrap">
              {plan.content || <span className="italic text-gray-400">Não preenchido</span>}
            </p>
          </div>

          {/* Transcription Summary */}
          {transcription && transcription.status === 'completed' && (
            <div className="print-section mt-6 p-4 bg-gray-50 border border-gray-200 rounded text-sm">
              <h3 className="font-bold mb-2 uppercase tracking-wide text-gray-700">
                TRANSCRIÇÃO DA CONSULTA
              </h3>
              <p>
                Consulta transcrita por IA. Duração:{' '}
                {Math.floor((transcription.duration_seconds || 0) / 60)} minutos.{' '}
                {transcription.speaker_segments?.length || 0} segmentos identificados.
              </p>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="mt-24 pt-8 print-section flex flex-col items-center justify-center text-center">
          <div className="w-[300px] border-t border-black mb-3"></div>
          <div className="font-bold text-lg">{doctor?.full_name}</div>
          <div className="text-sm text-gray-600">{doctor?.specialty}</div>
          <div className="text-sm text-gray-600">
            CRM {doctor?.crm_number || '-'}/{doctor?.crm_state || '-'}
          </div>
          <div className="text-sm mt-3 text-gray-500">
            {format(new Date(rec.completed_at || rec.updated_at || new Date()), 'dd/MM/yyyy')}
          </div>

          {rec.status === 'signed' && (
            <div className="mt-6 text-xs bg-gray-50 px-4 py-3 rounded border border-gray-300 inline-block text-left">
              <div className="font-semibold text-gray-700">
                Prontuário assinado digitalmente em{' '}
                {format(new Date(rec.signed_at), 'dd/MM/yyyy às HH:mm')}
              </div>
              {rec.signature_hash && (
                <div className="mt-1 font-mono text-[10px] text-gray-500">
                  Hash de assinatura: {rec.signature_hash}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 print-section">
          {rec.status !== 'signed' && (
            <div className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">
              RASCUNHO - DOCUMENTO NÃO ASSINADO
            </div>
          )}
          Documento gerado em {format(new Date(), 'dd/MM/yyyy às HH:mm')}
        </div>
      </div>
    </div>
  )
}
