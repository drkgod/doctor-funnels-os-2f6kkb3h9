import { supabase } from '@/lib/supabase/client'

export function useNotificationTriggers() {
  const notifyTranscriptionComplete = async (
    tenantId: string,
    userId: string,
    recordId: string,
    patientName: string,
  ) => {
    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Transcricao concluida',
      message: `Prontuario de ${patientName} preenchido pela IA.`,
      type: 'transcription',
      reference_id: recordId,
      reference_type: 'medical_record',
      read: false,
    })
  }

  const notifyAppointmentReminder = async (
    tenantId: string,
    userId: string,
    appointmentId: string,
    patientName: string,
    time: string,
  ) => {
    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Consulta em breve',
      message: `${patientName} as ${time}`,
      type: 'appointment',
      reference_id: appointmentId,
      reference_type: 'appointment',
      read: false,
    })
  }

  const notifyRecordSigned = async (
    tenantId: string,
    userId: string,
    recordId: string,
    patientName: string,
  ) => {
    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Prontuario assinado',
      message: `Prontuario de ${patientName} assinado com sucesso.`,
      type: 'record',
      reference_id: recordId,
      reference_type: 'medical_record',
      read: false,
    })
  }

  const notifyNewPatient = async (tenantId: string, patientName: string) => {
    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      user_id: null,
      title: 'Novo paciente',
      message: `${patientName} foi cadastrado.`,
      type: 'system',
      read: false,
    })
  }

  return {
    notifyTranscriptionComplete,
    notifyAppointmentReminder,
    notifyRecordSigned,
    notifyNewPatient,
  }
}
