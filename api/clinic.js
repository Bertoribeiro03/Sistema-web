import { AppError, changeRecord, collections } from '../shared/domain.js'
import { signup, login, readSession, verifySession, publicState, clearCookie } from '../server/auth.js'
import { readAccount, mutateAccount } from '../server/store.js'

async function inputFrom(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new AppError(415, 'Envie os dados em JSON.')
  const origin = req.headers.origin
  if (origin && URL.parse(origin)?.host !== req.headers.host) throw new AppError(403, 'Origem da requisição inválida.')
  let body = req.body
  if (body === undefined) {
    const chunks = []
    let length = 0
    for await (const chunk of req) {
      length += Buffer.byteLength(chunk)
      if (length > 16384) throw new AppError(413, 'Os dados enviados são muito grandes.')
      chunks.push(Buffer.from(chunk))
    }
    body = Buffer.concat(chunks).toString('utf8')
  }
  try {
    if (typeof body === 'string') body = JSON.parse(body)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
  } catch { throw new AppError(400, 'O formulário enviado é inválido.') }
  if (Buffer.byteLength(JSON.stringify(body)) > 16384) throw new AppError(413, 'Os dados enviados são muito grandes.')
  return body
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const params = new URL(req.url, 'http://localhost').searchParams
  const resource = params.get('resource') || 'state'
  const method = req.method
  try {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) throw new AppError(405, 'Método indisponível.')
    const input = method === 'GET' ? {} : await inputFrom(req)
    if (method === 'POST' && (resource === 'signup' || resource === 'login')) {
      const { state, sessionCookie } = await (resource === 'signup' ? signup(input) : login(input))
      res.setHeader('Set-Cookie', sessionCookie)
      res.statusCode = resource === 'signup' ? 201 : 200
      return res.end(JSON.stringify(state))
    }
    const session = readSession(req)
    if (method === 'POST' && resource === 'logout') {
      await mutateAccount(session.key, account => {
        verifySession(account, session.digest)
        account.sessions = account.sessions.filter(s => s.digest !== session.digest && s.until > Date.now())
      })
      res.setHeader('Set-Cookie', clearCookie())
      return res.end('{"ok":true}')
    }
    if (method === 'GET' && resource === 'state') {
      const account = (await readAccount(session.key))?.account
      verifySession(account, session.digest)
      return res.end(JSON.stringify(publicState(account)))
    }
    if (!collections.includes(resource) || method === 'GET') throw new AppError(404, 'Operação não encontrada.')
    const state = await mutateAccount(session.key, account => {
      verifySession(account, session.digest)
      changeRecord(account.data, resource, method, params.get('id'), input)
      return publicState(account)
    })
    res.statusCode = method === 'POST' ? 201 : 200
    res.end(JSON.stringify(state))
  } catch (error) {
    res.statusCode = error instanceof AppError ? error.status : 503
    if (res.statusCode === 503) console.error('Átrio: falha de armazenamento ou processamento.', error.name)
    res.end(JSON.stringify({ error: error instanceof AppError ? error.message : 'Não foi possível acessar o armazenamento. Tente novamente em instantes.' }))
  }
}
