import { useState } from 'react'
import { CalendarDays, FileText, Pencil, Trash2 } from 'lucide-react'
import { byName, directories, nowInClinic, prettyDate, statuses } from './model'
import { formatted } from './Records'
import { Modal, Select } from './ui'

const choices = [
  ['patientId', 'Paciente', 'patients'], ['doctorId', 'Dentista', 'doctors'], ['procedureId', 'Procedimento', 'procedures'],
]

export default function Editor({ modal, data, open, close, save, busy, addMissing }) {
  const { kind, resource, item, preset } = modal
  const [error, setError] = useState('')
  const isAppointment = resource === 'appointments'
  const cfg = directories[resource]
  const label = cfg?.singular || 'consulta'
  const title = kind === 'remove' ? 'Excluir ' + label : kind === 'detail' ? 'Detalhes do cadastro' : item ? 'Editar ' + label : cfg?.add || 'Nova consulta'
  const missing = isAppointment ? choices.filter(([, , group]) => !data[group].length) : []
  const displayTitle = kind === 'detail' && isAppointment ? 'Detalhes da consulta' : title
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const values = kind === 'remove' ? {} : Object.fromEntries(new FormData(e.currentTarget))
    if (item) values.version = item.version
    setError('')
    try { await save(resource, kind === 'remove' ? 'DELETE' : item ? 'PUT' : 'POST', values, item?.id) }
    catch (err) { setError(err.message) }
  }
  const links = isAppointment && item ? choices.map(([key, name, group]) => [name, data[group].find(x => x.id === item[key])?.name || '—']) : []
  const details = kind === 'detail' && (isAppointment
    ? [...links, ['Data', prettyDate(item.date)], ['Horário', item.time], ['Duração', item.duration + ' min'], ['Status', item.status]]
    : cfg.fields.map(f => [f.label, formatted(f.key, item[f.key])]))
  return <Modal title={displayTitle} close={close} busy={busy} icon={kind === 'remove' ? Trash2 : isAppointment ? CalendarDays : FileText}>
    {kind === 'detail' ? <>
      <dl className="details">{details.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <div className="form-actions"><button className="btn secondary" onClick={close}>Fechar</button><button className="btn primary" onClick={() => open('edit', resource, item)}><Pencil size={16}/>Editar {label}</button></div>
    </> : kind === 'edit' && missing.length > 0 ? <div className="prerequisite"><p>Para agendar, cadastre os itens abaixo. A agenda será reaberta depois de salvar.</p>
      {missing.map(([, , group]) => <button key={group} className="btn secondary" onClick={() => addMissing(group)}>{directories[group].add}</button>)}
    </div> : <form onSubmit={submit}>
      {kind === 'remove' ? <p className="confirm-text">Deseja excluir <strong>{item.name || ('a consulta de ' + (links[0]?.[1] || 'paciente') + ' em ' + prettyDate(item.date) + ' às ' + item.time)}</strong>?</p>
        : <div className="form-grid">{isAppointment ? <>
          {choices.map(([key, name, group]) => <label key={key} className="wide">{name}<Select name={key} defaultValue={item?.[key] || preset?.[key] || ''} required><option value="">Selecione</option>{[...data[group]].sort(byName).map(x => <option value={x.id} key={x.id}>{x.name}{group === 'procedures' ? ' · ' + (item?.procedureId === x.id ? item.duration : x.duration) + ' min' : group === 'doctors' ? ' · ' + x.specialty : ''}</option>)}</Select></label>)}
          <label>Data<input type="date" name="date" required min="1900-01-01" defaultValue={item?.date || preset?.date || nowInClinic().date}/></label>
          <label>Horário<input type="time" name="time" required defaultValue={item?.time || ''}/></label>
          <label className="wide">Status<Select name="status" defaultValue={item?.status || 'Agendada'}>{statuses.map(x => <option key={x}>{x}</option>)}</Select></label>
        </> : cfg.fields.map(f => <label key={f.key} className={f.wide ? 'wide' : ''}>{f.label}{!f.required && <span className="optional">opcional</span>}
          <input type={f.type || 'text'} name={f.key} defaultValue={item?.[f.key] ?? (f.key === 'duration' ? 30 : '')} required={f.required}
            placeholder={f.placeholder} min={f.type === 'date' ? '1900-01-01' : f.min} max={f.key === 'birthDate' ? nowInClinic().date : f.type === 'number' ? f.max : undefined}
            maxLength={f.type === 'email' ? 200 : f.type === 'tel' ? 24 : 100} minLength={f.key === 'name' ? 2 : undefined}/>
        </label>)}</div>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="form-actions"><button type="button" className="btn secondary" onClick={close} disabled={busy}>Voltar</button><button className={'btn ' + (kind === 'remove' ? 'danger' : 'primary')} disabled={busy}>
        {busy ? 'Aguarde…' : kind === 'remove' ? 'Confirmar exclusão' : isAppointment ? 'Salvar consulta' : 'Salvar cadastro'}</button></div>
    </form>}
  </Modal>
}
