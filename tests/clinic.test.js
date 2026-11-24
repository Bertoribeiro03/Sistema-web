import test from 'node:test'
import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

test('Fluxos da API do consultório', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'atrio-qa-'))
  const env = { ...process.env, ATRIO_STORAGE: 'sqlite', ATRIO_DATA_DIR: directory }
  delete env.VERCEL
  let server, origin, cookie
  const start = async () => {
    server = fork(fileURLToPath(new URL('./http-fixture.js', import.meta.url)), { env, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] })
    const [message] = await once(server, 'message')
    origin = 'http://127.0.0.1:' + message.port
  }
  const stop = async () => {
    if (!server || server.exitCode !== null || server.signalCode) return
    const exited = once(server, 'exit')
    server.kill()
    await exited
  }
  t.after(async () => {
    await stop()
    if (dirname(resolve(directory)) === resolve(tmpdir())) await rm(directory, { recursive: true, force: true })
  })
  await start()
  async function request(resource, method = 'GET', body, id, session = cookie) {
    const params = new URLSearchParams({ resource })
    if (id) params.set('id', id)
    const res = await fetch(origin + '/api/clinic?' + params, {
      method, headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] }
  }
  const identity = { name: 'Pessoa de teste', email: randomUUID() + '@example.invalid', password: randomBytes(24).toString('hex') }
  let doc, patient, employee, procedure, appointment
  await t.test('cadastro, validação, login e proteção da API', async () => {
    assert.equal((await request('state')).status, 401)
    assert.equal((await request('signup', 'POST', { ...identity, password: '' })).status, 400)
    const created = await request('signup', 'POST', identity)
    assert.equal(created.status, 201)
    assert.equal(created.body.data.procedures.length, 5)
    assert.equal(created.body.user.name, identity.name)
    assert.equal((await request('signup', 'POST', { ...identity, email: identity.email.toUpperCase() })).status, 409)
    assert.equal((await request('login', 'POST', { ...identity, password: randomUUID() })).status, 401)
    const logged = await request('login', 'POST', identity)
    assert.equal(logged.status, 200)
    cookie = logged.cookie
    assert.equal((await request('state')).status, 200)
  })
  const add = async (resource, data) => {
    const result = await request(resource, 'POST', data)
    assert.equal(result.status, 201, result.body.error)
    return result.body.data[resource].at(-1)
  }
  const edit = async (resource, item, changes) => {
    const result = await request(resource, 'PUT', { ...item, ...changes }, item.id)
    assert.equal(result.status, 200, result.body.error)
    return result.body.data[resource].find(x => x.id === item.id)
  }
  const remove = async (resource, item) => {
    const result = await request(resource, 'DELETE', { version: item.version }, item.id)
    assert.equal(result.status, 200, result.body.error)
    assert.ok(!result.body.data[resource].some(x => x.id === item.id))
  }
  await t.test('cadastros de dentista, paciente, funcionário e procedimento', async () => {
    doc = await add('doctors', { name: 'Dentista Teste', specialty: 'Ortodontia', credential: 'cro/sp 98765' })
    assert.equal(doc.credential, 'CRO-SP 98765')
    assert.equal((await request('doctors', 'POST', doc)).status, 409)
    doc = await edit('doctors', doc, { specialty: 'Clínica geral' })
    patient = await add('patients', { name: 'Paciente Teste', birthDate: '2000-01-12' })
    patient = await edit('patients', patient, { name: 'Paciente de teste' })
    const privateEmail = randomUUID() + '@example.invalid'
    employee = await add('employees', { name: 'Equipe Teste', role: 'Recepção', email: privateEmail })
    const previous = employee.version
    employee = await edit('employees', employee, { role: 'Auxiliar' })
    assert.equal((await request('employees', 'PUT', { ...employee, version: previous }, employee.id)).status, 409)
    procedure = await add('procedures', { name: 'Procedimento de teste', duration: 30 })
    procedure = await edit('procedures', procedure, { duration: 40 })
    assert.equal((await request('patients', 'POST', { name: 'Teste', birthDate: '2024-02-31' })).status, 400)
  })
  await t.test('agendamento, concorrência, vínculos, cancelamento e status', async () => {
    const values = { doctorId: doc.id, patientId: patient.id, procedureId: procedure.id, date: '2030-04-11', time: '09:00' }
    const two = await Promise.all([request('appointments', 'POST', values), request('appointments', 'POST', values)])
    assert.deepEqual(two.map(r => r.status).sort(), [201, 409])
    appointment = two.find(r => r.status === 201).body.data.appointments[0]
    assert.equal((await request('appointments', 'POST', { ...values, time: '09:30' })).status, 409)
    const next = await add('appointments', { ...values, time: '09:40' })
    assert.equal((await request('patients', 'DELETE', { version: patient.version }, patient.id)).status, 409)
    appointment = await edit('appointments', appointment, { status: 'Confirmada' })
    appointment = await edit('appointments', appointment, { status: 'Cancelada' })
    const replacement = await add('appointments', values)
    assert.equal((await request('appointments', 'PUT', { ...appointment, status: 'Agendada' }, appointment.id)).status, 409)
    await remove('appointments', replacement)
    appointment = await edit('appointments', appointment, { status: 'Concluída', time: '08:00' })
    await remove('appointments', next)
    procedure = await edit('procedures', procedure, { duration: 20 })
    assert.equal(appointment.duration, 40)
  })
  await t.test('persistência após reinício e isolamento entre contas', async () => {
    await stop(); await start()
    const result = await request('state')
    assert.equal(result.body.data.appointments[0].id, appointment.id)
    assert.equal(result.body.data.appointments[0].duration, 40)
    const other = await request('signup', 'POST', { ...identity, email: randomUUID() + '@example.invalid' })
    assert.equal(other.body.data.patients.length, 0)
    assert.equal((await request('patients', 'PUT', patient, patient.id, other.cookie)).status, 404)
  })
  await t.test('exclusões e encerramento da sessão no servidor', async () => {
    await remove('appointments', appointment)
    for (const [resource, item] of [['doctors', doc], ['patients', patient], ['employees', employee], ['procedures', procedure]]) await remove(resource, item)
    assert.equal((await request('logout', 'POST', {})).status, 200)
    assert.equal((await request('state')).status, 401)
    assert.equal((await request('logout', 'POST', {})).status, 401)
  })
})
