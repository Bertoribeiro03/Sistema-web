import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, List, Plus } from 'lucide-react'
import { appointmentRows, byName, dayKey, normalized, nowInClinic, prettyDate, statuses } from './model'
import { Actions, Pager } from './Records'
import { Empty, IconButton, PageHead, SearchBox, Select, Status } from './ui'

function Month({ date, setDate, rows }) {
  const first = new Date(date.slice(0, 7) + '-01T12:00:00')
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const start = (first.getDay() + 6) % 7
  const counts = rows.reduce((acc, a) => { acc[a.date] = (acc[a.date] || 0) + 1; return acc }, {})
  const today = nowInClinic().date
  function move(step) { setDate(dayKey(new Date(first.getFullYear(), first.getMonth() + step, 1))) }
  return <div className="month">
    <div className="month-title"><h3>{prettyDate(date, { month: 'long', year: 'numeric' })}</h3>
      <div><IconButton label="Mês anterior" icon={ChevronLeft} onClick={() => move(-1)}/><button className="plain" onClick={() => setDate(today)}>Hoje</button><IconButton label="Próximo mês" icon={ChevronRight} onClick={() => move(1)}/></div>
    </div>
    <div className="month-grid">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(w => <span className="weekday" key={w}>{w}</span>)}
      {Array.from({ length: start }, (_, i) => <span aria-hidden="true" key={'blank' + i}/>)}
      {Array.from({ length: count }, (_, i) => {
        const value = date.slice(0, 8) + String(i + 1).padStart(2, '0')
        return <button key={value} className={value === today ? 'today' : ''} aria-pressed={value === date} aria-label={prettyDate(value) + ', ' + (counts[value] || 0) + ' consulta(s)'} onClick={() => setDate(value)}>
          {i + 1}{Boolean(counts[value]) && <small>{counts[value]}</small>}
        </button>
      })}
    </div>
  </div>
}
export function AppointmentTable({ rows, open }) {
  return <div className="table-scroll"><table><thead><tr>{['Data e hora', 'Paciente', 'Dentista', 'Procedimento', 'Status', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map(a => <tr key={a.id}>
      <td data-label="Data e hora"><strong>{a.time}</strong><small>{prettyDate(a.date)}</small></td>
      <td data-label="Paciente"><button className="text-link" onClick={() => open('detail', 'appointments', a)}>{a.patient}</button></td>
      <td data-label="Dentista">{a.doctor}</td><td data-label="Procedimento">{a.procedure}<small>{a.duration} min</small></td>
      <td data-label="Status"><Status value={a.status}/></td><td data-label="Ações"><Actions label={'consulta de ' + a.patient} onView={() => open('detail', 'appointments', a)} onEdit={() => open('edit', 'appointments', a)} onDelete={() => open('remove', 'appointments', a)}/></td>
    </tr>)}</tbody></table></div>
}
export default function Schedule({ data, open, initialFilter }) {
  const [mode, setMode] = useState('list')
  const [date, setDate] = useState(initialFilter?.date || nowInClinic().date)
  const [listDate, setListDate] = useState(initialFilter?.date || '')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(initialFilter?.status || '')
  const [doctor, setDoctor] = useState('')
  const [requestedPage, setPage] = useState(1)
  const all = useMemo(() => appointmentRows(data), [data])
  const filtered = all.filter(a => (!status || status === a.status) && (!doctor || doctor === a.doctorId) &&
    normalized([a.patient, a.doctor, a.procedure].join(' ')).includes(normalized(query.trim())))
  const target = mode === 'list' ? listDate : date
  const rows = filtered.filter(a => !target || a.date === target)
  const pages = Math.ceil(rows.length / 10)
  const page = Math.min(requestedPage, pages) || 1
  const reset = () => { setQuery(''); setStatus(''); setDoctor(''); setListDate(''); setPage(1) }
  return <>
    <PageHead title="Consultas" description="Organize os atendimentos e acompanhe cada horário da agenda." action="Nova consulta" onAction={() => open('edit', 'appointments', null, { date: target || nowInClinic().date })}/>
    <section className="panel list-panel">
      <div className="toolbar"><SearchBox label="Buscar paciente, dentista ou procedimento" value={query} onChange={v => { setQuery(v); setPage(1) }}/>
        <div className="segmented view-mode"><button aria-pressed={mode === 'list'} onClick={() => { setMode('list'); setPage(1) }}><List size={16}/>Lista</button><button aria-pressed={mode === 'month'} onClick={() => { setMode('month'); setPage(1) }}><CalendarDays size={16}/>Calendário</button></div>
      </div>
      <div className="filters"><label>Status<Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">Todos os status</option>{statuses.map(x => <option key={x}>{x}</option>)}</Select></label>
        <label>Dentista<Select value={doctor} onChange={e => { setDoctor(e.target.value); setPage(1) }}><option value="">Todos os dentistas</option>{[...data.doctors].sort(byName).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></label>
        {mode === 'list' && <label>Data<input type="date" value={listDate} onChange={e => { setListDate(e.target.value); setPage(1) }}/></label>}
        {(status || doctor || query || (mode === 'list' && listDate)) && <button className="plain" onClick={reset}>Limpar filtros</button>}
      </div>
      {mode === 'month' && <><Month date={date} setDate={d => { setDate(d); setPage(1) }} rows={filtered}/>
        <div className="day-title"><h3>{prettyDate(date, { day: 'numeric', month: 'long' })}</h3><button className="plain" onClick={() => open('edit', 'appointments', null, { date })}><Plus size={15}/> Agendar neste dia</button></div></>}
      {rows.length ? <AppointmentTable rows={rows.slice((page - 1) * 10, page * 10)} open={open}/> : <Empty icon={ClipboardList} title="Nenhuma consulta encontrada">Agende um atendimento ou ajuste os filtros da agenda.</Empty>}
      <Pager total={rows.length} pages={pages} page={page} setPage={setPage} noun="consulta(s)"/>
    </section>
  </>
}
