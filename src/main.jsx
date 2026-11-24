import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, ClipboardList, ContactRound, LayoutDashboard, LoaderCircle, LogOut, Menu, RefreshCw, Stethoscope, UsersRound, X } from 'lucide-react'
import '@fontsource-variable/dm-sans'
import Auth from './Auth'
import Dashboard from './Dashboard'
import Records from './Records'
import Schedule from './Schedule'
import Editor from './Editor'
import { api, initials, nowInClinic, prettyDate } from './model'
import { Brand, IconButton, Notice } from './ui'
import './style.css'

const pages = [
  ['dashboard', 'Painel', 'painel', LayoutDashboard], ['appointments', 'Consultas', 'consultas', CalendarDays],
  ['patients', 'Pacientes', 'pacientes', UsersRound], ['doctors', 'Dentistas', 'dentistas', Stethoscope],
  ['employees', 'Funcionários', 'funcionarios', ContactRound], ['procedures', 'Procedimentos', 'procedimentos', ClipboardList],
]
const pageFromUrl = () => pages.find(p => '#/' + p[2] === location.hash)?.[0] || 'dashboard'

function App() {
  const [model, setModel] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [page, setPage] = useState(pageFromUrl)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState(null)
  const sequence = useRef(0)
  const writing = useRef(false)
  const [, setMinute] = useState(0)
  const close = () => setModal(null)
  const open = (kind, resource, item = null, preset = {}) => setModal({ kind, resource, item, preset })
  const signedOut = useCallback((message = '') => {
    setModel(null); setPhase('auth'); setMenu(false); setModal(null); setFilter(null); setAlert(message)
  }, [])
  const refresh = useCallback(async (initial = false) => {
    if (writing.current) return
    const request = ++sequence.current
    if (initial) setPhase('loading')
    setRefreshing(true)
    try {
      const state = await api()
      if (request === sequence.current) { setModel(state); setPhase('ready'); setAlert('') }
    } catch (err) {
      if (request !== sequence.current) return
      if (err.status === 401) signedOut(initial ? '' : 'Sua sessão terminou. Entre novamente.')
      else { setAlert(err.message); if (initial) setPhase('error') }
    } finally { if (request === sequence.current) setRefreshing(false) }
  }, [signedOut])
  useEffect(() => {
    refresh(true)
    const route = () => { setPage(pageFromUrl()); setMenu(false); setModal(null); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [refresh])
  useEffect(() => {
    if (phase !== 'ready') return
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visible)
    const timer = setInterval(() => setMinute(v => v + 1), 60000)
    return () => { document.removeEventListener('visibilitychange', visible); clearInterval(timer) }
  }, [phase, refresh])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5200)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (!menu) return
    const esc = e => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [menu])
  function navigate(id, options = null) {
    setFilter(options); setPage(id); setMenu(false); setModal(null)
    location.hash = '/' + pages.find(p => p[0] === id)[2]
    window.scrollTo(0, 0)
  }
  async function save(resource, method, fields, id) {
    if (writing.current) return
    writing.current = true; sequence.current++; setBusy(true); setRefreshing(false)
    try {
      const updated = await api(resource, method, fields, id)
      setModel(updated); setAlert('')
      if (modal.resume) {
        const key = { doctors: 'doctorId', patients: 'patientId', procedures: 'procedureId' }[resource]
        const added = updated.data[resource].find(x => !model.data[resource].some(old => old.id === x.id))
        open('edit', 'appointments', null, { ...modal.resume, [key]: added?.id })
      } else close()
      setNotice(method === 'DELETE' ? 'Registro excluído.' : resource === 'appointments' ? 'Consulta salva na agenda.' : 'Cadastro salvo.')
    } catch (err) {
      if (err.status === 401) signedOut('Sua sessão terminou. Entre novamente.')
      else if (err.status === 409 || err.status === 404) {
        try { setModel(await api()) } catch { /* A mensagem da operação permanece no formulário. */ }
      }
      throw err
    } finally { writing.current = false; setBusy(false) }
  }
  async function logout() {
    if (writing.current) return
    writing.current = true; sequence.current++; setBusy(true)
    try {
      await api('logout', 'POST', {})
      signedOut(); setNotice('Você saiu da conta.'); navigate('dashboard')
    } catch (err) {
      if (err.status === 401) signedOut()
      else setAlert(err.message)
    } finally { writing.current = false; setBusy(false); setRefreshing(false) }
  }
  if (phase === 'loading' || phase === 'error') return <main className="loading"><Brand/>{phase === 'error' ?
    <><p className="error" role="alert">{alert}</p><button className="btn primary" onClick={() => refresh(true)}>Tentar novamente</button></> : <p><LoaderCircle size={17} className="spin"/> Abrindo o consultório…</p>}</main>
  if (!model) return <><Auth initialError={alert} onEntry={(state, text) => { sequence.current++; setModel(state); setPhase('ready'); setAlert(''); setNotice(text); setRefreshing(false) }}/><Notice message={notice} onDismiss={() => setNotice('')}/></>
  const title = pages.find(p => p[0] === page)[1]
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content').focus() }}>Ir para o conteúdo</a>
    {menu && <button aria-label="Fechar navegação" className="scrim" onClick={() => setMenu(false)}/>}
    <aside className={'sidebar' + (menu ? ' open' : '')} id="sidebar"><div className="side-brand"><Brand/><button className="mobile-close" aria-label="Fechar menu" onClick={() => setMenu(false)}><X size={20}/></button></div>
      <nav aria-label="Menu do consultório">{pages.map(([id, label, slug, Icon], i) => <div key={id}>
        {(i === 0 || i === 2) && <p className="nav-label">{i === 0 ? 'Consultório' : 'Cadastros'}</p>}
        <a href={'#/' + slug} aria-current={page === id ? 'page' : undefined} onClick={e => { e.preventDefault(); navigate(id) }}><Icon size={19} strokeWidth={1.7}/>{label}</a>
      </div>)}</nav>
      <div className="account"><span className="avatar">{initials(model.user.name)}</span><div><strong>{model.user.name}</strong><small>{model.user.email}</small></div></div>
      <button className="logout" disabled={busy} onClick={logout}><LogOut size={17}/>Sair da conta</button>
    </aside>
    <div className="main-area"><div className="topbar"><button className="menu-toggle" aria-expanded={menu} aria-controls="sidebar" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu size={22}/></button><span className="breadcrumbs">Consultório <i>/</i> <strong>{title}</strong></span>
      <div className="top-tools"><span><CalendarDays size={15}/>{prettyDate(nowInClinic().date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><IconButton label="Atualizar dados" icon={RefreshCw} disabled={refreshing || busy} onClick={() => refresh()}/></div></div>
      <main className="content" id="main-content" tabIndex="-1">
        {alert && <p className="error" role="alert">{alert}</p>}
        {page === 'dashboard' ? <Dashboard model={model} open={open} navigate={navigate} agendaToday={s => navigate('appointments', {date: nowInClinic().date, status: s})}/> :
          page === 'appointments' ? <Schedule key={JSON.stringify(filter)} data={model.data} open={open} initialFilter={filter}/> :
          <Records key={page} resource={page} data={model.data} open={open}/>}
      </main>
    </div>
    {modal && <Editor key={[modal.kind, modal.resource, modal.item?.id].join('/')} modal={modal} data={model.data} open={open} close={close} save={save} busy={busy} addMissing={group => setModal({ kind: 'edit', resource: group, resume: modal.preset })}/>}
    <Notice message={notice} onDismiss={() => setNotice('')}/>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>)
