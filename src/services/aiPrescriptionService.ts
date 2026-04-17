import { supabase } from '@/lib/supabase/client'

export const aiPrescriptionService = {
  async suggestPrescription(
    tenantId: string,
    diagnosis: string,
    specialty: string,
    patientContext?: string,
    documentType: string = 'prescription',
  ) {
    const { data, error } = await supabase.functions.invoke('suggest-prescription', {
      body: {
        tenant_id: tenantId,
        diagnosis,
        specialty,
        patient_context: patientContext,
        document_type: documentType,
      },
    })

    if (error) {
      throw new Error(error.message || 'Erro ao conectar com o serviço de IA.')
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    return data
  },
}
