import { useState } from 'react'
import { ShieldCheck, Loader2, XCircle } from 'lucide-react'
import { signatureService } from '@/services/signatureService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function VerifySignature() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await signatureService.verifySignature(code.trim())
      if (res && res.valid) {
        setResult(res)
      } else {
        setError('O codigo informado nao corresponde a nenhum prontuario assinado.')
      }
    } catch (err: any) {
      setError('Ocorreu um erro ao verificar o codigo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 md:p-10">
      <div className="w-full max-w-[480px] mx-auto">
        <h1 className="text-[18px] font-bold text-center mb-8 text-foreground">Doctor Funnels</h1>

        <div className="bg-card border rounded-[var(--radius)] p-6 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="text-[20px] font-bold text-center text-foreground">
              Verificar Documento
            </h2>
          </div>

          <p className="text-[14px] text-muted-foreground text-center mb-6">
            Insira o codigo de verificacao para confirmar a autenticidade do documento.
          </p>

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <Input
              placeholder="SIG-XXXXXXXX-XXXX-XXXX"
              className="h-11 text-[15px] text-center font-mono tracking-[1px] uppercase placeholder:tracking-normal placeholder:normal-case"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={!code.trim() || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Verificar
            </Button>
          </form>

          {error && (
            <div className="mt-6 p-5 bg-[hsl(0,84%,60%)]/5 border border-[hsl(0,84%,60%)]/15 rounded-[var(--radius)] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center mb-3">
                <XCircle className="w-8 h-8 text-[hsl(0,84%,60%)]" />
              </div>
              <h3 className="text-[16px] font-bold text-[hsl(0,84%,60%)] text-center mb-3">
                Documento nao encontrado
              </h3>
              <p className="text-[13px] text-center text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-5 bg-[hsl(152,68%,40%)]/5 border border-[hsl(152,68%,40%)]/15 rounded-[var(--radius)] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center mb-3">
                <ShieldCheck className="w-8 h-8 text-[hsl(152,68%,40%)]" />
              </div>
              <h3 className="text-[16px] font-bold text-[hsl(152,68%,40%)] text-center mb-4">
                Documento Verificado
              </h3>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-[12px] text-muted-foreground">Profissional</span>
                  <span className="text-[13px] font-medium text-foreground">
                    Dr(a). {result.doctor_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-[12px] text-muted-foreground">Especialidade</span>
                  <span className="text-[13px] font-medium text-foreground">
                    {result.specialty}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-[12px] text-muted-foreground">Tipo de Documento</span>
                  <span className="text-[13px] font-medium text-foreground">
                    Prontuario Medico (
                    {result.record_type === 'consultation' ? 'Consulta' : result.record_type})
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[12px] text-muted-foreground">Data da Assinatura</span>
                  <span className="text-[13px] font-medium text-foreground">
                    {format(new Date(result.signed_at), "dd/MM/yyyy 'as' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
