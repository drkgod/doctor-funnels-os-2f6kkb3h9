import { supabase } from '@/lib/supabase/client'

export const prescriptionService = {
  async createPrescription(
    recordId: string,
    tenantId: string,
    doctorId: string,
    patientId: string,
    prescriptionData: any,
  ) {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        record_id: recordId,
        tenant_id: tenantId,
        doctor_id: doctorId,
        patient_id: patientId,
        prescription_type: prescriptionData.type,
        medications: prescriptionData.medications,
        notes: prescriptionData.notes,
        valid_until: prescriptionData.valid_until || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async fetchPrescriptions(recordId: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updatePrescription(prescriptionId: string, dataToUpdate: any) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({
        prescription_type: dataToUpdate.type,
        medications: dataToUpdate.medications,
        notes: dataToUpdate.notes,
        valid_until: dataToUpdate.valid_until || null,
        status: dataToUpdate.status || 'active',
      })
      .eq('id', prescriptionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletePrescription(prescriptionId: string) {
    const { error } = await supabase.from('prescriptions').delete().eq('id', prescriptionId)

    if (error) throw error
    return true
  },
}
