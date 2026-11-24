import { useEffect, useId, useRef } from 'react'
import { CalendarDays, Check, ChevronDown, Inbox, Plus, Search, X } from 'lucide-react'
import { statusClass } from './model'

export function Brand() {
  return <span className="brand"><span className="brandmark" aria-hidden="true"><i/><i/></span><span>Átrio <b>Odonto</b></span></span>
}
export function IconButton({ label, icon: Icon, ...props }) {
  return <button type="button" className="icon-btn" aria-label={label} title={label} {...props}><Icon size={17}/></button>
}
export function Status({ value }) {
  return <span className={'status ' + statusClass[value]}><i/>{value}</span>
}
export function Empty({ icon: Icon = Inbox, title, children, action }) {
  return <div className="empty"><span className="empty-icon"><Icon size={24} strokeWidth={1.6}/></span><strong>{title}</strong>{children && <p>{children}</p>}{action}</div>
}
export function SearchBox({ value, onChange, label }) {
  return <label className="searchbox"><Search size={17}/><input type="search" aria-label={label} placeholder={label} value={value} onChange={e => onChange(e.target.value)}/></label>
}
export function Select({ children, ...props }) {
  return <span className="select-wrap"><select {...props}>{children}</select><ChevronDown size={15} aria-hidden="true"/></span>
}
export function PageHead({ title, description, action, onAction }) {
  return <header className="page-head"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <button className="btn primary" onClick={onAction}><Plus size={17}/>{action}</button>}</header>
}
export function Modal({ title, children, close, busy = false, icon: Icon = CalendarDays }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previous }
  }, [])
  return <dialog className="modal" ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); if (!busy) close() }}
    onClick={e => { if (e.target === ref.current && !busy) close() }}>
    <div className="modal-body"><div className="modal-head"><span className="head-icon"><Icon size={20}/></span><h2 id={id}>{title}</h2><IconButton label="Fechar janela" icon={X} onClick={close} disabled={busy}/></div>{children}</div>
  </dialog>
}
export function Notice({ message, onDismiss }) {
  if (!message) return null
  return <div className="toast" role="status"><Check size={17}/>{message}<IconButton label="Dispensar aviso" icon={X} onClick={onDismiss}/></div>
}
