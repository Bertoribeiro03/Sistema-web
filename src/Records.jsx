import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2, UsersRound } from 'lucide-react'
import { byName, directories, initials, normalized, prettyDate } from './model'
import { Empty, IconButton, PageHead, SearchBox } from './ui'

export function Pager({ page, setPage, pages, total, noun = 'registros' }) {
  return <div className="pager"><span>{total} {noun}</span>{pages > 1 &&
    <div><IconButton label="Página anterior" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}/>
      <span>{page} / {pages}</span><IconButton label="Próxima página" icon={ChevronRight} disabled={page >= pages} onClick={() => setPage(page + 1)}/></div>}</div>
}
export function Actions({ label, onView, onEdit, onDelete }) {
  return <div className="row-actions">
    <IconButton label={'Ver ' + label} icon={Eye} onClick={onView}/>
    <IconButton label={'Editar ' + label} icon={Pencil} onClick={onEdit}/>
    <IconButton label={'Excluir ' + label} icon={Trash2} onClick={onDelete}/>
  </div>
}
export function formatted(key, value) {
  if (value === '' || value == null) return '—'
  if (key === 'birthDate') return prettyDate(value)
  if (key === 'duration') return value + ' min'
  return value
}
export default function Records({ resource, data, open }) {
  const [query, setQuery] = useState('')
  const [requestedPage, setPage] = useState(1)
  const config = directories[resource]
  const items = data[resource].filter(item => config.fields.some(f => normalized(item[f.key]).includes(normalized(query.trim())))).sort(byName)
  const pages = Math.ceil(items.length / 10)
  const page = Math.min(requestedPage, pages) || 1
  return <>
    <PageHead title={config.title} description={config.description} action={config.add} onAction={() => open('edit', resource)}/>
    <section className="panel list-panel">
      <div className="toolbar"><SearchBox value={query} onChange={q => { setQuery(q); setPage(1) }} label={'Buscar em ' + config.title.toLowerCase()}/></div>
      {items.length ? <div className="table-scroll"><table><thead><tr>{config.fields.map(f => <th key={f.key}>{f.label}</th>)}<th>Ações</th></tr></thead>
        <tbody>{items.slice((page - 1) * 10, page * 10).map(item => <tr key={item.id}>
          {config.fields.map(f => <td key={f.key} data-label={f.label}>{f.key === 'name' ?
            <button className="person-link" onClick={() => open('detail', resource, item)}>{resource !== 'procedures' && <span className="avatar">{initials(item.name)}</span>}{item.name}</button>
            : formatted(f.key, item[f.key])}</td>)}
          <td data-label="Ações"><Actions label={item.name} onView={() => open('detail', resource, item)} onEdit={() => open('edit', resource, item)} onDelete={() => open('remove', resource, item)}/></td>
        </tr>)}</tbody>
      </table></div> : <Empty icon={UsersRound} title={query ? 'Nenhum resultado' : 'Nenhum cadastro por aqui'}>{query ? 'Tente outro termo de busca.' : 'Use o botão acima para incluir o primeiro registro.'}</Empty>}
      <Pager total={items.length} pages={pages} page={page} setPage={setPage}/>
    </section>
  </>
}
