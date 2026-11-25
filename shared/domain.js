export class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const statuses = ['Agendada', 'Confirmada', 'Concluída', 'Cancelada']
export const collections = ['doctors', 'patients', 'employees', 'procedures', 'appointments']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function field(value, label, max = 100, required = true) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new AppError(400, `Preencha o campo ${label}.`)
  if (text.length > max) throw new AppError(400, `O campo ${label} aceita até ${max} caracteres.`)
  return text
}

export function email(value, required = true) {
  const text = field(value, 'e-mail', 200, required).toLowerCase()
  if (text && !emailPattern.test(text)) throw new AppError(400, 'Informe um e-mail válido.')
  return text
}

function phone(value) {
  const text = field(value, 'telefone', 24, false)
  if (text && (!/^[+\d\s().-]+$/.test(text) || !/^\d{10,15}$/.test(text.replace(/\D/g, '')))) {
    throw new AppError(400, 'Informe o telefone com DDD.')
  }
  return text
}

function validDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') throw new AppError(400, `Informe uma data válida para ${label}.`)
  const parsed = new Date(value + 'T12:00:00Z')
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new AppError(400, 'A data informada não existe.')
  return value
}

export function initialData() {
  return {
    doctors: [], patients: [], employees: [], appointments: [],
    procedures: [
      ['Avaliação odontológica', 30], ['Profilaxia', 45], ['Restauração', 60],
      ['Manutenção ortodôntica', 30], ['Retorno odontológico', 20],
    ].map(([name, duration]) => ({ id: crypto.randomUUID(), version: 1, name, duration })),
  }
}

function minutes(time) {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

function appointment(data, input, current) {
  const doctor = data.doctors.find(x => x.id === input.doctorId)
  const patient = data.patients.find(x => x.id === input.patientId)
  const procedure = data.procedures.find(x => x.id === input.procedureId)
  if (!doctor || !patient || !procedure) throw new AppError(400, 'Selecione um paciente, um dentista e um procedimento cadastrados.')
  const date = validDate(input.date, 'a consulta')
  const time = field(input.time, 'horário', 5)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError(400, 'Informe um horário válido.')
  const status = input.status ?? 'Agendada'
  if (!statuses.includes(status)) throw new AppError(400, 'Selecione um status válido.')
  const duration = current?.procedureId === procedure.id ? current.duration : procedure.duration
  const start = minutes(time)
  const end = start + duration
  if (end > 1440) throw new AppError(400, 'A consulta precisa terminar até o fim do mesmo dia.')
  if (status !== 'Cancelada') {
    const conflict = data.appointments.find(other => {
      if (other.id === current?.id || other.status === 'Cancelada' || other.date !== date) return false
      const otherStart = minutes(other.time)
      return (other.doctorId === doctor.id || other.patientId === patient.id) && start < otherStart + other.duration && otherStart < end
    })
    if (conflict) {
      const person = conflict.doctorId === doctor.id ? 'O dentista' : 'O paciente'
      throw new AppError(409, `${person} já possui uma consulta nesse intervalo. Escolha outro horário.`)
    }
  }
  return { doctorId: doctor.id, patientId: patient.id, procedureId: procedure.id, date, time, duration, status }
}

function record(data, resource, input, current) {
  if (resource === 'appointments') return appointment(data, input, current)
  const name = field(input.name, 'nome')
  if (name.length < 2) throw new AppError(400, 'O nome precisa ter pelo menos 2 caracteres.')
  switch (resource) {
    case 'doctors': {
      const match = field(input.credential, 'CRO', 30).toUpperCase().match(/^(CRO)[\s/-]*([A-Z]{2})[\s/-]*(\d{1,8}[A-Z]?)$/)
      if (!match) throw new AppError(400, 'Informe o CRO com a UF e o número, como CRO-SP 123456.')
      const credential = `${match[1]}-${match[2]} ${match[3]}`
      if (data.doctors.some(d => d.id !== current?.id && d.credential === credential)) throw new AppError(409, 'Este registro profissional já está cadastrado.')
      return { name, credential, specialty: field(input.specialty, 'especialidade'), phone: phone(input.phone) }
    }
    case 'patients': {
      const birthDate = validDate(input.birthDate, 'o nascimento')
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
      if (birthDate > today) throw new AppError(400, 'O nascimento não pode ser uma data futura.')
      return { name, birthDate, phone: phone(input.phone), email: email(input.email, false) }
    }
    case 'employees':
      return { name, role: field(input.role, 'função'), email: email(input.email), phone: phone(input.phone) }
    case 'procedures': {
      const duration = Number(input.duration)
      if (!Number.isInteger(duration) || duration < 5 || duration > 480) throw new AppError(400, 'A duração deve ser um número inteiro entre 5 e 480 minutos.')
      if (data.procedures.some(p => p.id !== current?.id && p.name.localeCompare(name, 'pt-BR', { sensitivity: 'base' }) === 0)) throw new AppError(409, 'Um procedimento com esse nome já existe.')
      return { name, duration }
    }
    default: throw new AppError(404, 'Área não encontrada.')
  }
}

export function changeRecord(data, resource, method, id, input) {
  const list = data[resource]
  const index = method === 'POST' ? -1 : list.findIndex(item => item.id === id)
  const current = list[index]
  if (method !== 'POST') {
    if (!current) throw new AppError(404, 'O registro não existe mais. Atualize a página.')
    if (input.version !== current.version) throw new AppError(409, 'Este registro foi alterado em outro acesso. Feche a janela e confira os dados atualizados.')
  }
  if (method === 'DELETE') {
    const relation = { doctors: 'doctorId', patients: 'patientId', procedures: 'procedureId' }[resource]
    if (relation && data.appointments.some(a => a[relation] === id)) throw new AppError(409, 'Este cadastro está vinculado a uma consulta. Remova o vínculo antes de excluí-lo.')
    list.splice(index, 1)
  } else {
    const fields = record(data, resource, input, current)
    if (method === 'POST') list.push({ id: crypto.randomUUID(), version: 1, ...fields })
    else list[index] = { id, version: current.version + 1, ...fields }
  }
}
