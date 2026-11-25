import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { AppError, field, email, initialData } from '../shared/domain.js'
import { readAccount, createAccount, mutateAccount } from './store.js'

const derive = promisify(scrypt)
const hash = value => createHash('sha256').update(value).digest('hex')
const cookieName = 'atrio_session'
const lifetime = 7 * 24 * 60 * 60
const invalidLogin = () => new AppError(401, 'E-mail ou senha incorretos.')

function cookie(value, seconds) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' && process.env.ATRIO_COOKIE_SECURE === '1'
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`
}
export const clearCookie = () => cookie('', 0)

function newSession(account, key) {
  const secret = randomBytes(32).toString('base64url')
  account.sessions = account.sessions.filter(s => s.until > Date.now()).slice(-7)
  account.sessions.push({ digest: hash(secret), until: Date.now() + lifetime * 1000 })
  return cookie(key + '.' + secret, lifetime)
}
export function readSession(req) {
  const value = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))
  const match = value?.slice(cookieName.length + 1).match(/^([a-f0-9]{64})\.([\w-]{43})$/)
  if (!match) throw new AppError(401, 'Entre para acessar o consultório.')
  return { key: match[1], digest: hash(match[2]) }
}
export function verifySession(account, digest) {
  if (!account?.sessions.some(s => s.digest === digest && s.until > Date.now())) throw new AppError(401, 'Sua sessão terminou. Entre novamente.')
}
export const publicState = account => ({ user: account.profile, data: account.data })
const makeHash = (value, salt) => derive(value, salt, 64, { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 })

export async function signup(input) {
  const name = field(input.name, 'nome')
  const address = email(input.email)
  const pass = input.password
  if (name.length < 2) throw new AppError(400, 'Informe seu nome com pelo menos 2 caracteres.')
  if (typeof pass !== 'string' || !pass.trim() || pass.length < 10 || pass.length > 128) throw new AppError(400, 'Use uma senha de 10 a 128 caracteres.')
  const key = hash(address)
  const salt = randomBytes(16).toString('hex')
  const account = {
    profile: { name, email: address }, salt, verifier: (await makeHash(pass, salt)).toString('hex'),
    sessions: [], failedLogins: 0, blockedUntil: 0, data: initialData(),
  }
  const sessionCookie = newSession(account, key)
  await createAccount(key, account)
  return { sessionCookie, state: publicState(account) }
}
export async function login(input) {
  const key = hash(email(input.email))
  if (typeof input.password !== 'string' || !input.password || input.password.length > 128) throw invalidLogin()
  const account = (await readAccount(key))?.account
  const blockedError = () => new AppError(429, 'Muitas tentativas. Aguarde 10 minutos antes de entrar.')
  if (account?.blockedUntil > Date.now()) throw blockedError()
  const result = await makeHash(input.password, account?.salt || key.slice(0, 32))
  if (!account) throw invalidLogin()
  const correct = timingSafeEqual(result, Buffer.from(account.verifier, 'hex'))
  const response = await mutateAccount(key, current => {
    if (current.blockedUntil > Date.now()) throw blockedError()
    if (!correct) {
      current.failedLogins = current.blockedUntil ? 1 : current.failedLogins + 1
      current.blockedUntil = current.failedLogins >= 8 ? Date.now() + 600000 : 0
      return null
    }
    current.failedLogins = current.blockedUntil = 0
    return { sessionCookie: newSession(current, key), state: publicState(current) }
  })
  if (!response) throw invalidLogin()
  return response
}
