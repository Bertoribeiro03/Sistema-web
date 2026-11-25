import { CalendarCheck, CalendarDays, Clock3, ListChecks, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import { appointmentRows, nowInClinic, prettyDate, statusClass, statuses } from './model'
import { Empty, PageHead, Status } from './ui'

export default function Dashboard({ model, open, navigate, agendaToday }) {
  const { data, user } = model
  const { date, time } = nowInClinic()
  const rows = appointmentRows(data)
  const day = rows.filter(a => a.date === date)
  const upcoming = rows.filter(a => ['Agendada', 'Confirmada'].includes(a.status) && a.date + a.time >= date + time).slice(0, 4)
  const h = Number(time.split(':')[0])
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const stats = [
    ['Consultas de hoje', day.length, CalendarDays, 'sage', agendaToday],
    ['Confirmadas hoje', day.filter(a => a.status === 'Confirmada').length, CalendarCheck, 'blue', () => agendaToday('Confirmada')],
    ['Pacientes cadastrados', data.patients.length, UsersRound, 'peach', () => navigate('patients')],
    ['Dentistas', data.doctors.length, Stethoscope, 'lavender', () => navigate('doctors')],
  ]
  return <>
    <PageHead title={greet + ', ' + user.name.split(/\s+/)[0] + '.'} description={'Sua agenda de ' + prettyDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) + '.'} action="Nova consulta" onAction={() => open('edit', 'appointments')}/>
    <div className="stats-grid">{stats.map(([label, number, Icon, color, go]) => <button key={label} className="stat" onClick={() => go()}>
      <span className={'stat-icon ' + color}><Icon size={19}/></span><strong>{number}</strong><span>{label}</span>
    </button>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div className="ico-title"><Clock3/><h2>Próximas consultas</h2></div><button className="plain" onClick={() => navigate('appointments')}>Ver agenda</button></div>
      {upcoming.length ? <ul className="next-list">{upcoming.map(a => <li key={a.id}><button onClick={() => open('detail', 'appointments', a)}>
        <span className="date-tile"><b>{a.date.slice(-2)}</b><small>{prettyDate(a.date, { month: 'short' }).replace('.', '')}</small></span>
        <span className="next-info"><strong>{a.patient}</strong><span>{a.procedure} · {a.doctor}</span><small>{a.time} · {a.duration} min</small></span><Status value={a.status}/>
      </button></li>)}</ul> : <Empty icon={CalendarDays} title="Agenda livre por enquanto">Os próximos atendimentos aparecerão aqui após o agendamento.</Empty>}
    </section>
    <section className="panel day-summary"><div className="panel-head"><div className="ico-title"><ListChecks/><h2>Resumo do dia</h2></div></div>
      <ul>{statuses.map(s => <li key={s}><span className={'legend ' + statusClass[s]}><i/>{s}</span><b>{day.filter(a => a.status === s).length}</b></li>)}</ul>
    </section></div>
    <section className="quick-panel"><div><h2>Cadastros rápidos</h2><p>Adicione quem será atendido ou quem fará parte da equipe.</p></div>
      <div><button className="btn secondary" onClick={() => open('edit', 'patients')}><UserRound size={16}/>Novo paciente</button><button className="btn secondary" onClick={() => open('edit', 'doctors')}><Stethoscope size={16}/>Novo dentista</button></div>
    </section>
    {!model.samplePeopleImported && <button className="plain" onClick={() => open('samples', 'sample-people')}>Adicionar cadastros de exemplo</button>}
  </>
}
