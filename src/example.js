import { changeRecord, collections } from '../shared/domain.js'
import { createExampleData } from './sample-people.js'

let connection
function openDatabase() {
  if (!connection) {
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('atrio-consultorio-exemplo', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('consultorio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch(() => {
      connection = undefined
      throw new Error('Permita o armazenamento do navegador para abrir o consultório de exemplo.')
    })
  }
  return connection
}

function createExample() {
  return {
    user: { name: 'Equipe de exemplo', email: 'equipe@consultorio.example.invalid' },
    data: createExampleData(),
  }
}

export async function exampleApi(resource = 'state', method = 'GET', fields, id) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('consultorio', 'readwrite')
    const store = tx.objectStore('consultorio')
    const request = store.get('exemplo')
    let model, error
    request.onsuccess = () => {
      try {
        model = request.result ?? createExample()
        if (method !== 'GET') {
          if (!collections.includes(resource)) throw new Error('Operação indisponível no exemplo.')
          changeRecord(model.data, resource, method, id, fields)
        }
        if (!request.result || method !== 'GET') store.put(model, 'exemplo')
      } catch (err) {
        error = err
        tx.abort()
      }
    }
    tx.oncomplete = () => resolve(model)
    tx.onabort = () => reject(error || new Error('Não foi possível salvar os dados do exemplo neste navegador.'))
  })
}
