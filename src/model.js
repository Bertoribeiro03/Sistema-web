export const statuses = ['Agendada', 'Confirmada', 'Concluída', 'Cancelada']
export const statusClass = { Agendada: 'scheduled', Confirmada: 'confirmed', Concluída: 'completed', Cancelada: 'cancelled' }
export const directories = {
  patients: {
    title: 'Pacientes', singular: 'paciente', add: 'Novo paciente',
    description: 'Cadastros e contatos dos pacientes do consultório.',
    fields: [
      { key: 'name', label: 'Nome completo', required: true, wide: true, max: 100 },
      { key: 'birthDate', label: 'Data de nascimento', type: 'date', required: true },
      { key: 'phone', label: 'Telefone com DDD', type: 'tel', placeholder: '(11) 99999-0000' },
      { key: 'email', label: 'E-mail', type: 'email', wide: true },
    ],
  },
  doctors: {
    title: 'Dentistas', singular: 'dentista', add: 'Novo dentista',
    description: 'Profissionais, especialidades e registros no CRO.',
    fields: [
      { key: 'name', label: 'Nome completo', required: true, wide: true },
      { key: 'credential', label: 'Registro no CRO', required: true, placeholder: 'CRO-SP 123456' },
      { key: 'specialty', label: 'Especialidade', required: true, placeholder: 'Ex.: Ortodontia' },
      { key: 'phone', label: 'Telefone com DDD', type: 'tel', wide: true },
    ],
  },
  employees: {
    title: 'Funcionários', singular: 'funcionário', add: 'Novo funcionário',
    description: 'Equipe de recepção, apoio e administração.',
    fields: [
      { key: 'name', label: 'Nome completo', required: true, wide: true },
      { key: 'role', label: 'Função', required: true, placeholder: 'Ex.: Recepcionista' },
      { key: 'phone', label: 'Telefone com DDD', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email', required: true, wide: true },
    ],
  },
  procedures: {
    title: 'Procedimentos', singular: 'procedimento', add: 'Novo procedimento',
    description: 'Serviços odontológicos e tempo reservado para cada atendimento.',
    fields: [
      { key: 'name', label: 'Nome do procedimento', required: true, wide: true },
      { key: 'duration', label: 'Duração em minutos', type: 'number', min: 5, max: 480, required: true, wide: true },
    ],
  },
}
export function nowInClinic() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(now)
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  return { date, time }
}
export function prettyDate(date, options) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', options)
}
export function dayKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export const initials = name => name.trim().split(/\s+/).filter((_, i, a) => i === 0 || i === a.length - 1).map(p => p[0]).join('').toUpperCase()
export const normalized = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const byName = (a, b) => a.name.localeCompare(b.name, 'pt-BR')
export function appointmentRows(data) {
  const map = key => new Map(data[key].map(x => [x.id, x.name]))
  const patients = map('patients'), doctors = map('doctors'), procedures = map('procedures')
  return data.appointments.map(a => ({ ...a, patient: patients.get(a.patientId), doctor: doctors.get(a.doctorId), procedure: procedures.get(a.procedureId) }))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}
export async function api(resource = 'state', method = 'GET', body, id) {
  const params = new URLSearchParams({ resource })
  if (id) params.set('id', id)
  let response
  try {
    response = await fetch('/api/clinic?' + params, {
      method, credentials: 'same-origin', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
  } catch { throw new Error('Sem conexão com o servidor. Verifique a internet e tente novamente.') }
  const result = await response.json().catch(() => ({}))
  if (!response.ok || (!result.user && !result.ok)) {
    const error = new Error(result.error || 'O serviço não respondeu como esperado. Tente novamente.')
    error.status = response.status
    throw error
  }
  return result
}
