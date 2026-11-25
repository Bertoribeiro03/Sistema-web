import test from 'node:test'
import assert from 'node:assert/strict'
import { createExampleData } from '../src/sample-people.js'
import { initialData, changeRecord } from '../shared/domain.js'

test('consultório de exemplo contém 120 cadastros distintos e utilizáveis em consultas', () => {
  const data = createExampleData()
  const { doctors, patients, employees, procedures } = data
  assert.deepEqual([doctors.length, patients.length, employees.length], [15, 90, 15])
  assert.equal(new Set([...doctors, ...patients, ...employees].map(item => item.name)).size, 120)
  assert.equal(new Set(doctors.map(item => item.credential)).size, 15)
  assert.equal(new Set([...patients, ...employees].map(item => item.email)).size, 105)
  changeRecord(data, 'appointments', 'POST', null, {
    patientId: patients[0].id, doctorId: doctors[0].id, procedureId: procedures[0].id, date: '2031-09-18', time: '11:00',
  })
  assert.equal(data.appointments[0].patientId, patients[0].id)
  assert.equal(createExampleData().appointments.length, 0)
  const privateClinic = initialData()
  assert.deepEqual([privateClinic.doctors.length, privateClinic.patients.length, privateClinic.employees.length], [0, 0, 0])
})
