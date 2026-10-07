'use client'
import { useState } from 'react'
import { supabase, BUCKET } from '../lib/supabase'

const STAGES = ['BEFORE', 'DURING', 'AFTER']
const COLORS = { BEFORE: '#c2410c', DURING: '#1d4ed8', AFTER: '#15803d' }
const LABEL = { BEFORE: 'Before', DURING: 'During', AFTER: 'After' }
const empty = () => ({ BEFORE: [], DURING: [], AFTER: [] })

// Burns the category caption (BEFORE / DURING / AFTER), site and time into the photo,
// so every image carries its own caption when shared to WhatsApp.
async function stamp(file, stage, site) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const x = c.getContext('2d')
  x.drawImage(bmp, 0, 0, w, h)
  const bar = Math.max(52, Math.round(h * 0.07))
  x.fillStyle = COLORS[stage]
  x.fillRect(0, h - bar, w, bar)
  x.fillStyle = '#fff'
  x.font = `bold ${Math.round(bar * 0.45)}px sans-serif`
  x.textBaseline = 'middle'
  x.fillText(`${stage}  |  ${site}  |  ${new Date().toLocaleString()}`, 14, h - bar / 2)
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))
  return new File([blob], `${stage.toLowerCase()}-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

export default function Home() {
  const [meta, setMeta] = useState({ site: '', technician: '', job: '' })
  const [photos, setPhotos] = useState(empty())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const total = STAGES.reduce((n, s) => n + photos[s].length, 0)
  const ready = meta.site.trim().length > 0

  async function add(stage, e) {
    const files = [...e.target.files]
    e.target.value = ''
    const out = []
    for (const f of files) {
      const file = await stamp(f, stage, meta.site.trim())
      out.push({ file, url: URL.createObjectURL(file) })
    }
    setPhotos((p) => ({ ...p, [stage]: [...p[stage], ...out] }))
  }

  const remove = (stage, i) =>
    setPhotos((p) => ({ ...p, [stage]: p[stage].filter((_, j) => j !== i) }))

  async function save() {
    const { data: r, error } = await supabase
      .from('reports')
      .insert({ site: meta.site.trim(), technician: meta.technician.trim(), job: meta.job.trim() })
      .select()
      .single()
    if (error) throw error
    const rows = await Promise.all(
      STAGES.flatMap((stage) =>
        photos[stage].map(async ({ file }) => {
          const path = `${r.id}/${file.name}`
          const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'image/jpeg' })
          if (up.error) throw up.error
          return { report_id: r.id, stage, path }
        })
      )
    )
    const ins = await supabase.from('photos').insert(rows)
    if (ins.error) throw ins.error
  }

  async function shareToWhatsApp() {
    const files = STAGES.flatMap((s) => photos[s].map((p) => p.file))
    const text =
      `*${meta.site.trim()}*${meta.job.trim() ? ' - ' + meta.job.trim() : ''}\n` +
      (meta.technician.trim() ? `Technician: ${meta.technician.trim()}\n` : '') +
      `Before: ${photos.BEFORE.length} | During: ${photos.DURING.length} | After: ${photos.AFTER.length}`
    setBusy(true); setMsg('')
    // Start saving in the background so the share sheet opens right away.
    const saving = save().then(() => true, () => false)
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, text })
      } else {
        files.forEach((f) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(f); a.download = f.name; a.click()
        })
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
      }
    } catch (err) {
      if (err.name !== 'AbortError') setMsg('Sharing failed: ' + err.message)
    }
    const saved = await saving
    setMsg((m) => m || (saved ? 'Report saved.' : 'Photos were shared, but saving online failed.'))
    setBusy(false)
  }

  function reset() { setPhotos(empty()); setMeta({ site: '', technician: '', job: '' }); setMsg('') }

  return (
    <main>
      <div className="top">
        <h1>Progress photo report</h1>
        <a href="/reports">Saved reports</a>
      </div>

      <input type="text" placeholder="Site / location (required)" value={meta.site}
        onChange={(e) => setMeta({ ...meta, site: e.target.value })} />
      <input type="text" placeholder="Job / task" value={meta.job}
        onChange={(e) => setMeta({ ...meta, job: e.target.value })} />
      <input type="text" placeholder="Technician name" value={meta.technician}
        onChange={(e) => setMeta({ ...meta, technician: e.target.value })} />

      {STAGES.map((stage) => (
        <section key={stage} className={`stage ${stage}`}>
          <div className="head">
            <h2>{LABEL[stage]} ({photos[stage].length})</h2>
            <label className={`btn ${ready ? '' : 'off'}`}>
              Capture photo
              <input type="file" accept="image/*" capture="environment" hidden disabled={!ready}
                onChange={(e) => add(stage, e)} />
            </label>
          </div>
          {photos[stage].length === 0 ? (
            <p className="empty">{ready ? 'No photos yet. Tap Capture photo.' : 'Enter the site name to start.'}</p>
          ) : (
            <div className="grid">
              {photos[stage].map((p, i) => (
                <div key={p.url}>
                  <img src={p.url} alt={`${LABEL[stage]} ${i + 1}`} />
                  <button onClick={() => remove(stage, i)} aria-label="Remove photo">×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {msg && <p className="msg">{msg}</p>}
      {total > 0 && !busy && msg && <button className="btn" onClick={reset}>Start new report</button>}

      <div className="bar">
        <button className="btn" disabled={!ready || total === 0 || busy} onClick={shareToWhatsApp}>
          {busy ? 'Working...' : `Share ${total} photo${total === 1 ? '' : 's'} to WhatsApp`}
        </button>
      </div>
    </main>
  )
}
