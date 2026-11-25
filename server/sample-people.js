import { AppError, changeRecord } from './domain.js'

const givenNames = [
  'Alice', 'André', 'Beatriz', 'Bruno', 'Camila', 'Caio', 'Carolina', 'Daniel', 'Débora', 'Diogo',
  'Elisa', 'Eduardo', 'Fernanda', 'Felipe', 'Gabriela', 'Gustavo', 'Helena', 'Henrique', 'Isabela', 'Igor',
  'Júlia', 'João', 'Larissa', 'Leonardo', 'Lívia', 'Lucas', 'Marina', 'Mateus', 'Natália', 'Rafael',
]
const middleNames = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Ferraz', 'Gomes', 'Lima', 'Mendes', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Rocha', 'Tavares', 'Vieira', 'Xavier']
const lastNames = ['Andrade', 'Borges', 'Campos', 'Dias', 'Freitas', 'Garcia', 'Leite', 'Moraes', 'Pires', 'Ribeiro', 'Santana', 'Teixeira', 'Viana']
const specialties = ['Clínica geral', 'Ortodontia', 'Endodontia', 'Periodontia', 'Odontopediatria', 'Implantodontia', 'Prótese dentária', 'Dentística', 'Cirurgia e traumatologia bucomaxilofacial', 'Odontogeriatria']
const roles = ['Recepcionista', 'Auxiliar de saúde bucal', 'Técnico em saúde bucal', 'Assistente administrativo', 'Auxiliar de esterilização', 'Coordenador de atendimento', 'Assistente financeiro']
function name(i) {
  return [givenNames[i % givenNames.length], middleNames[(i * 7) % middleNames.length], lastNames[(i * 5) % lastNames.length]].join(' ')
}
const pad = n => String(n).padStart(2, '0')
function contact(group, i, person) {
  const slug = person.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '.')
  return slug + '.' + String(i + 1).padStart(3,'0') + '@' + group + '.example.invalid'
}
function makeSamples() {
  return {
    doctors: Array.from({length:15}, (_, i) => ({
      name: name(i), specialty: specialties[i % specialties.length], credential: 'CRO-SP ' + (99000001 + i),
    })),
    patients: Array.from({length:90}, (_, i) => ({
      name: name(i + 15), birthDate: [1951 + (i * 13) % 67, pad(1 + (i * 7) % 12), pad(1 + (i * 9) % 28)].join('-'),
      email: contact('pacientes', i, name(i + 15)),
    })),
    employees: Array.from({length:15}, (_, i) => ({
      name: name(i + 105), role: roles[i % roles.length], email: contact('equipe', i, name(i + 105)),
    })),
  }
}

export function importSamplePeople(account) {
  if (account.samplePeopleImported) return
  const samples = makeSamples()
  for (const [group, rows] of Object.entries(samples)) {
    const key = group === 'doctors' ? 'credential' : 'email'
    const existing = new Set(account.data[group].map(row => row[key]))
    if (rows.some(row => existing.has(row[key]))) {
      throw new AppError(409, 'Um CRO ou e-mail do lote de exemplo já está cadastrado. Confira os registros deste consultório.')
    }
  }
  for (const [group, rows] of Object.entries(samples)) {
    for (const row of rows) changeRecord(account.data, group, 'POST', null, row)
  }
  account.samplePeopleImported = true
}
