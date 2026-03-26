import { useState } from 'react'
import './HealthCheck.css'

// ── Utilities ────────────────────────────────────────────────────────────────

function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function weeklyWage(emp) {
  const rate = parseFloat(emp.rate) || 0
  const hours = parseFloat(emp.hoursPerWeek) || 0
  if (emp.rateType === 'Salary') return rate / 52
  return rate * hours
}

function weeksElapsedThisYear() {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const ms = now - jan1
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)))
}

function currentYearTag() {
  return new Date().getFullYear().toString().slice(-2)
}

function isBillableJob(fullNumber, yearTag) {
  if (!fullNumber || fullNumber === 'null') return false
  const prefix = fullNumber.split('-')[0].toUpperCase()
  if (prefix === 'NCP' || prefix === 'NIC') return false
  return fullNumber.includes('-' + yearTag + '-')
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  // Parse a single CSV line respecting quoted fields
  function parseLine(line) {
    const fields = []
    let field = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
        else if (ch === '"') { inQuote = false }
        else { field += ch }
      } else {
        if (ch === '"') { inQuote = true }
        else if (ch === ',') { fields.push(field.trim()); field = '' }
        else { field += ch }
      }
    }
    fields.push(field.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

function parseInvoiceDate(str) {
  if (!str || str === 'null') return null
  // Try ISO first
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d
  // Try MM/DD/YYYY
  const parts = str.split('/')
  if (parts.length === 3) {
    d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function parseClockDate(str) {
  if (!str || str === 'null') return null
  // Format: MM/DD/YYYY - HH:MM AM/PM
  const datePart = str.split(' - ')[0] || str.split(' ')[0]
  return parseInvoiceDate(datePart)
}

// ── FileUploadRow ─────────────────────────────────────────────────────────────

function FileUploadRow({ label, onLoad }) {
  const [status, setStatus] = useState({ type: 'empty', text: 'No file' })

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        setStatus({ type: 'loaded', text: `Loaded — ${rows.length} rows` })
        onLoad(rows)
      } catch (err) {
        setStatus({ type: 'error', text: 'Error parsing file' })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="hc-upload-row">
      <span className="hc-upload-label">{label}</span>
      <input className="hc-upload-input" type="file" accept=".csv" onChange={handleFile} />
      <span className={`hc-upload-badge ${status.type}`}>{status.text}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HealthCheck({ employees, markup }) {
  const [timeclockData, setTimeclockData] = useState(null)
  const [billingData, setBillingData] = useState(null)

  const yearTag = currentYearTag()
  const weeksElapsed = weeksElapsedThisYear()
  const weeklyPayroll = employees.reduce((sum, e) => sum + weeklyWage(e), 0)
  const annualPayroll = weeklyPayroll * 52
  const payrollToDate = weeklyPayroll * weeksElapsed

  // ── Billing metrics ───────────────────────────────────────────
  const billableRows = billingData
    ? billingData.filter(r => isBillableJob(r.full_number, yearTag))
    : []

  const revenueBilled = billableRows.reduce((sum, r) => {
    return sum + (parseFloat((r.total_invoice || '').replace(/[^0-9.-]/g, '')) || 0)
  }, 0)

  const invoiceCount = billableRows.length
  const avgInvoice = invoiceCount > 0 ? revenueBilled / invoiceCount : 0

  // Monthly breakdown (current year only)
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const thisYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const byMonth = MONTH_NAMES.map((name, i) => ({ name, total: 0, count: 0, idx: i }))

  billableRows.forEach(r => {
    const d = parseInvoiceDate(r.invoice_date) || parseInvoiceDate(r.date_created)
    if (!d || d.getFullYear() !== thisYear) return
    const m = d.getMonth()
    byMonth[m].total += parseFloat((r.total_invoice || '').replace(/[^0-9.-]/g, '')) || 0
    byMonth[m].count += 1
  })

  const monthsToShow = byMonth.filter(m => m.idx <= currentMonth)

  // ── Pipeline metrics ──────────────────────────────────────────
  const tcJobs = timeclockData
    ? new Set(timeclockData.map(r => r.full_number).filter(fn => isBillableJob(fn, yearTag)))
    : new Set()

  const billedJobs = new Set(billableRows.map(r => r.full_number))
  const unbilledJobs = [...tcJobs].filter(fn => !billedJobs.has(fn))
  const unbilledPipeline = unbilledJobs.length * avgInvoice

  // ── Pace metrics ──────────────────────────────────────────────
  const breakevenWeekly = annualPayroll / 52
  const actualPaceWeekly = weeksElapsed > 0 ? revenueBilled / weeksElapsed : 0
  const paceRatio = breakevenWeekly > 0 ? actualPaceWeekly / breakevenWeekly : 0
  const pacePct = Math.round(Math.min(paceRatio, 1) * 100)
  const paceClass = paceRatio >= 1 ? 'good' : paceRatio >= 0.75 ? 'warn' : 'danger'

  // ── Alerts ────────────────────────────────────────────────────
  const alerts = []

  if (billingData && timeclockData) {
    if (revenueBilled < payrollToDate) {
      alerts.push({
        level: 'danger',
        msg: `Revenue billed (${currency(revenueBilled)}) is behind payroll to date (${currency(payrollToDate)}) by ${currency(payrollToDate - revenueBilled)}.`
      })
    }
    if (paceRatio < 0.9) {
      alerts.push({
        level: 'warning',
        msg: `Invoice pace (${currency(actualPaceWeekly)}/wk) is ${Math.round((1 - paceRatio) * 100)}% below breakeven rate of ${currency(breakevenWeekly)}/wk.`
      })
    }
    if (currentMonth >= 2) {
      const janUnbilled = [...tcJobs].filter(fn => {
        if (billedJobs.has(fn)) return false
        const jobRows = timeclockData.filter(r => r.full_number === fn)
        return jobRows.some(r => {
          const d = parseClockDate(r.clock_in)
          return d && d.getMonth() === 0 && d.getFullYear() === thisYear
        })
      })
      if (janUnbilled.length > 0) {
        alerts.push({
          level: 'warning',
          msg: `${janUnbilled.length} January project(s) still appear unbilled: ${janUnbilled.slice(0, 5).join(', ')}${janUnbilled.length > 5 ? '…' : ''}`
        })
      }
    }
    if (alerts.length === 0) {
      alerts.push({ level: 'ok', msg: 'All indicators look healthy.' })
    }
  }

  const bothLoaded = billingData && timeclockData

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Health Check</h2>
          <p className="card-desc">Upload your monthly Supabase exports to check financial health</p>
        </div>
      </div>

      {/* File uploads */}
      <div className="hc-upload-area">
        <FileUploadRow label="Timeclock CSV" onLoad={setTimeclockData} />
        <FileUploadRow label="Billing CSV" onLoad={setBillingData} />
      </div>

      {!bothLoaded && (
        <div className="hc-empty-state">
          Upload both CSV files above to see your health metrics.
        </div>
      )}

      {bothLoaded && (
        <>
          {/* Summary cards */}
          <div className="summary-grid" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="summary-card">
              <div className="summary-label">
                Payroll to Date
                <span className="summary-sublabel"> ({weeksElapsed} wks)</span>
              </div>
              <div className="summary-value">{currency(payrollToDate)}</div>
            </div>
            <div className={`summary-card ${revenueBilled >= payrollToDate ? 'accent' : ''}`}
              style={revenueBilled < payrollToDate ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' } : {}}>
              <div className="summary-label">
                Revenue Billed
                <span className="summary-sublabel"> ({invoiceCount} invoices)</span>
              </div>
              <div className="summary-value">{currency(revenueBilled)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">
                Unbilled Pipeline
                <span className="summary-sublabel"> ({unbilledJobs.length} jobs × avg {currency(avgInvoice)})</span>
              </div>
              <div className="summary-value">{currency(unbilledPipeline)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">
                Invoice Pace
                <span className="summary-sublabel"> (breakeven {currency(breakevenWeekly)}/wk)</span>
              </div>
              <div className="summary-value">{currency(actualPaceWeekly)}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text)' }}>/wk</span></div>
            </div>
          </div>

          {/* Pace bar */}
          <div className="hc-pace-section">
            <div className="hc-pace-label">
              Invoice pace vs breakeven — <strong>{pacePct}%</strong>
            </div>
            <div className="hc-pace-track">
              <div className={`hc-pace-fill ${paceClass}`} style={{ width: pacePct + '%' }} />
            </div>
            <div className="hc-pace-meta">
              {currency(actualPaceWeekly)}/wk actual &nbsp;·&nbsp; {currency(breakevenWeekly)}/wk needed &nbsp;·&nbsp; {currency(annualPayroll)}/yr annual payroll
            </div>
          </div>

          {/* Monthly table */}
          <div className="hc-table-section">
            <h3>Monthly Billing ({thisYear})</h3>
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Invoices</th>
                  <th>Total Billed</th>
                  <th>Avg/Invoice</th>
                  <th>% of Annual Target</th>
                </tr>
              </thead>
              <tbody>
                {monthsToShow.map(m => (
                  <tr key={m.name}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.count || <span className="muted">—</span>}</td>
                    <td className="cost-cell">{m.total > 0 ? currency(m.total) : <span className="muted">—</span>}</td>
                    <td className="cost-cell">{m.count > 0 ? currency(m.total / m.count) : <span className="muted">—</span>}</td>
                    <td>{m.total > 0 ? (m.total / annualPayroll * 100).toFixed(1) + '%' : <span className="muted">—</span>}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 600 }}>
                  <td>YTD Total</td>
                  <td>{invoiceCount}</td>
                  <td className="cost-cell">{currency(revenueBilled)}</td>
                  <td className="cost-cell">{invoiceCount > 0 ? currency(avgInvoice) : <span className="muted">—</span>}</td>
                  <td>{(revenueBilled / annualPayroll * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Alerts */}
          <div className="hc-alerts-section">
            {alerts.map((a, i) => (
              <div key={i} className={`hc-alert ${a.level}`}>
                <span>{a.level === 'danger' ? '⚠' : a.level === 'warning' ? '⚡' : '✓'}</span>
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
