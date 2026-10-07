import { supabase, BUCKET } from '../../lib/supabase'

export const dynamic = 'force-dynamic'
const STAGES = ['BEFORE', 'DURING', 'AFTER']
const LABEL = { BEFORE: 'Before', DURING: 'During', AFTER: 'After' }

export default async function Reports() {
  const { data: reports, error } = await supabase
    .from('reports')
    .select('*, photos(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main>
      <div className="top">
        <h1>Saved reports</h1>
        <a href="/">New report</a>
      </div>
      {error && <p className="msg">Could not load reports: {error.message}</p>}
      {reports && reports.length === 0 && <p className="empty">No reports yet.</p>}
      {(reports || []).map((r) => (
        <article key={r.id} className="report">
          <strong>{r.site}</strong>{r.job ? ` - ${r.job}` : ''}<br />
          <small>{r.technician || 'No technician'} - {new Date(r.created_at).toLocaleString('en-GB')}</small>
          {STAGES.map((s) => {
            const list = r.photos.filter((p) => p.stage === s)
            if (!list.length) return null
            return (
              <div key={s} className={`stage ${s}`}>
                <h2>{LABEL[s]} ({list.length})</h2>
                <div className="grid">
                  {list.map((p) => {
                    const url = supabase.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl
                    return <a key={p.id} href={url} target="_blank"><img src={url} alt={LABEL[s]} /></a>
                  })}
                </div>
              </div>
            )
          })}
        </article>
      ))}
    </main>
  )
}
