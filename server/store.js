import { AppError } from './domain.js'

// Leitura consistente e gravação condicional nos dois ambientes.
function storageMode() {
  if (process.env.VERCEL) return 'blob'
  return process.env.ATRIO_STORAGE || 'sqlite'
}

let localDatabase
async function sqlite() {
  if (!localDatabase) {
    const [{ DatabaseSync }, fs, path] = await Promise.all([import('node:sqlite'), import('node:fs'), import('node:path')])
    if (!localDatabase) {
      const dir = path.resolve(process.env.ATRIO_DATA_DIR || '.data')
      fs.mkdirSync(dir, { recursive: true })
      const db = new DatabaseSync(path.join(dir, 'atrio.sqlite'))
      db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS accounts (key TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)')
      localDatabase = db
    }
  }
  return localDatabase
}

const blobPath = key => 'accounts/' + key + '.json'
export async function readAccount(key) {
  if (storageMode() === 'sqlite') {
    const db = await sqlite()
    const row = db.prepare('SELECT revision, body FROM accounts WHERE key=?').get(key)
    return row ? { revision: row.revision, account: JSON.parse(row.body) } : null
  }
  const { get } = await import('@vercel/blob')
  // A representação comprimida recebe um ETag fraco, incompatível com a gravação condicional.
  const result = await get(blobPath(key), {
    access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' },
  })
  if (!result) return null
  if (!result.blob.etag || result.blob.etag.startsWith('W/')) throw new Error('O armazenamento não confirmou a versão do registro.')
  return { revision: result.blob.etag, account: await new Response(result.stream).json() }
}

async function write(key, revision, account) {
  const body = JSON.stringify(account)
  if (storageMode() === 'sqlite') {
    const db = await sqlite()
    const result = revision == null
      ? db.prepare('INSERT OR IGNORE INTO accounts VALUES (?, 1, ?)').run(key, body)
      : db.prepare('UPDATE accounts SET revision=revision+1, body=? WHERE key=? AND revision=?').run(body, key, revision)
    return result.changes === 1
  }
  const { put, BlobPreconditionFailedError } = await import('@vercel/blob')
  try {
    await put(blobPath(key), body, {
      access: 'private', addRandomSuffix: false, contentType: 'application/json',
      allowOverwrite: revision != null, ...(revision != null ? { ifMatch: revision } : {}),
    })
    return true
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return false
    if (revision == null && await readAccount(key)) return false
    throw error
  }
}

export async function createAccount(key, account) {
  if (!(await write(key, null, account))) throw new AppError(409, 'Este e-mail já está cadastrado. Entre na sua conta.')
}

export async function mutateAccount(key, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await readAccount(key)
    if (!row) throw new AppError(401, 'Acesse sua conta novamente.')
    const result = change(row.account)
    if (await write(key, row.revision, row.account)) return result
  }
  throw new AppError(409, 'A agenda recebeu várias alterações. Tente novamente.')
}
