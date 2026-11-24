import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { readAccount } from '../server/store.js'

test('Blob usa a versão original para a próxima gravação condicional', async t => {
  const previous = getGlobalDispatcher()
  const mock = new MockAgent()
  mock.disableNetConnect()
  setGlobalDispatcher(mock)
  const localEnv = {
    ATRIO_STORAGE: 'blob', BLOB_STORE_ID: '', VERCEL_OIDC_TOKEN: '',
    BLOB_READ_WRITE_TOKEN: ['teste', 'local', 'mock', 'atriotest', randomUUID()].join('_'),
  }
  const original = Object.fromEntries(Object.keys(localEnv).map(key => [key, process.env[key]]))
  Object.assign(process.env, localEnv)
  t.after(async () => {
    setGlobalDispatcher(previous)
    await mock.close()
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  const origin = mock.get('https://atriotest.private.blob.vercel-storage.com')
  const request = { path: '/accounts/teste.json?cache=0', method: 'GET', headers: { 'accept-encoding': 'identity' } }
  const data = { profile: { name: 'Conta de teste' } }
  origin.intercept(request).reply(200, data, { headers: { etag: '"original"' } })
  assert.deepEqual(await readAccount('teste'), { revision: '"original"', account: data })
  origin.intercept(request).reply(200, data, { headers: { etag: 'W/"original"' } })
  await assert.rejects(readAccount('teste'), /não confirmou a versão/)
  mock.assertNoPendingInterceptors()
})
