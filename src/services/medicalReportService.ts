import { supabase } from '@/lib/supabase/client'

export const medicalReportService = {
  async createReport(
    recordId: string,
    tenantId: string,
    doctorId: string,
    patientId: string,
    reportData: any,
  ) {
    const { data, error } = await supabase
      .from('medical_reports')
      .insert({
        record_id: recordId,
        tenant_id: tenantId,
        doctor_id: doctorId,
        patient_id: patientId,
        report_type: reportData.report_type,
        title: reportData.title,
        content: reportData.content,
        metadata: {
          cid10: reportData.cid10,
          days_off: reportData.days_off,
          destination: reportData.destination,
        },
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async fetchReports(recordId: string) {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateReport(reportId: string, dataToUpdate: any) {
    const { data, error } = await supabase
      .from('medical_reports')
      .update({
        report_type: dataToUpdate.report_type,
        title: dataToUpdate.title,
        content: dataToUpdate.content,
        metadata: {
          cid10: dataToUpdate.cid10,
          days_off: dataToUpdate.days_off,
          destination: dataToUpdate.destination,
        },
        status: dataToUpdate.status || 'active',
      })
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteReport(reportId: string) {
    const { error } = await supabase.from('medical_reports').delete().eq('id', reportId)

    if (error) throw error
    return true
  },
}
