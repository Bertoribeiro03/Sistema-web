import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { api } from './model'
import { Brand } from './ui'

export default function Auth({ onEntry, initialError = '' }) {
  const [create, setCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  const [reveal, setReveal] = useState(false)
  function switchMode(mode) { setCreate(mode); setError(''); setReveal(false) }
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const fields = Object.fromEntries(new FormData(e.currentTarget))
    if (create && fields.password !== fields.confirm) { setError('As senhas precisam ser iguais.'); return }
    delete fields.confirm
    setError(''); setBusy(true)
    try { onEntry(await api(create ? 'signup' : 'login', 'POST', fields), create ? 'Conta criada. Seu consultório está pronto.' : 'Você entrou na sua conta.') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <main className="auth">
    <div className="auth-main"><div className="auth-brand"><Brand/></div>
      <section className="auth-form" aria-labelledby="auth-title">
        <div className="eyebrow"><span className="dash"/>GESTÃO ODONTOLÓGICA</div>
        <h1 id="auth-title">{create ? 'Crie sua conta.' : 'Boas-vindas.'}</h1>
        <p className="auth-intro">{create ? 'Abra um espaço privado para organizar os atendimentos do seu consultório.' : 'Entre para acessar a agenda e os cadastros do seu consultório.'}</p>
        <div className="segmented"><button type="button" disabled={busy} aria-pressed={!create} onClick={() => switchMode(false)}>Entrar</button><button type="button" disabled={busy} aria-pressed={create} onClick={() => switchMode(true)}>Criar conta</button></div>
        <form onSubmit={submit} key={create ? 'signup' : 'login'}>
          {create && <label>Seu nome<input name="name" required minLength="2" maxLength="100" autoComplete="name" placeholder="Nome e sobrenome"/></label>}
          <label>E-mail<input type="email" name="email" required maxLength="200" autoComplete="email" placeholder="seu@email.com"/></label>
          <label>Senha<span className="password"><input type={reveal ? 'text' : 'password'} name="password" required minLength={create ? 10 : 1} maxLength="128" autoComplete={create ? 'new-password' : 'current-password'} placeholder={create ? 'Pelo menos 10 caracteres' : 'Digite sua senha'}/><button type="button" aria-label={reveal ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setReveal(!reveal)}>{reveal ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
          {create && <label>Confirmar senha<input type="password" name="confirm" required minLength="10" maxLength="128" autoComplete="new-password" placeholder="Repita a senha"/></label>}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary auth-submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17}/>} {create ? 'Criar conta e entrar' : 'Entrar no consultório'}</button>
        </form>
        <a className="example-link" href="/exemplo">Abrir consultório de exemplo</a>
      </section>
    </div>
    <aside className="auth-art" aria-label="Sala de espera de um consultório odontológico"><img src="/consultorio.webp" alt="Sala de espera com banco de madeira e luz natural."/></aside>
  </main>
}
