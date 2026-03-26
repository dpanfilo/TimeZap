import { useState } from 'react'
import './App.css'
import HealthCheck from './HealthCheck.jsx'

const RATE_TYPES = ['Hourly', 'Salary']

const ROLE_DEFAULT_HOURS = {
  'Drafter': '9',
  'Field': '3',
  'Administrative': '3',
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function defaultEmployee() {
  return { id: uid(), name: '', role: '', rateType: 'Hourly', rate: '', hoursPerWeek: '40' }
}

function weeklyWage(emp) {
  const rate = parseFloat(emp.rate) || 0
  const hours = parseFloat(emp.hoursPerWeek) || 0
  if (emp.rateType === 'Salary') return rate / 52
  return rate * hours
}

const SEED_EMPLOYEES = [
  // Administrative (3) — avg $27/hr
  { name: 'Alice Johnson',    role: 'Administrative',  rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Brian Torres',     role: 'Administrative',  rateType: 'Hourly', rate: '27',     hoursPerWeek: '40' },
  { name: 'Carmen Lee',       role: 'Administrative',  rateType: 'Hourly', rate: '26',     hoursPerWeek: '40' },
  // Field (3) — avg $25/hr
  { name: 'David Kim',        role: 'Field',           rateType: 'Hourly', rate: '26',     hoursPerWeek: '40' },
  { name: 'Elena Russo',      role: 'Field',           rateType: 'Hourly', rate: '25',     hoursPerWeek: '40' },
  { name: 'Frank Nguyen',     role: 'Field',           rateType: 'Hourly', rate: '24',     hoursPerWeek: '40' },
  // Drafters (24)
  { name: 'Grace Patel',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Henry Brooks',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Irene Walsh',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'James Okafor',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Karen Müller',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Liam Chen',        role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Mia Fernandez',    role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Noah Singh',       role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Olivia Grant',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Paul Martinez',    role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Quinn Adams',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Rachel Yip',       role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Samuel Brown',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Tina Kowalski',    role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Umar Hassan',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Vera Johansson',   role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'William Park',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Xena Dubois',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Yusuf Ali',        role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Zoe Thompson',     role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Aaron Mitchell',   role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Bella Rossi',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Carlos Vega',      role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
  { name: 'Diana Osei',       role: 'Drafter',         rateType: 'Hourly', rate: '28',     hoursPerWeek: '40' },
].map(e => ({ ...e, id: uid() }))

export default function App() {
  const [employees, setEmployees] = useState(SEED_EMPLOYEES)
  const [markup, setMarkup] = useState('146')
  const [projects, setProjects] = useState([{ id: uid(), name: '', weeks: '1', assignedIds: {} }])

  // ── employee helpers ──────────────────────────────────────────────────────
  function updateEmployee(id, field, value) {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function addEmployee() {
    setEmployees(prev => [...prev, defaultEmployee()])
  }

  function removeEmployee(id) {
    setEmployees(prev => prev.filter(e => e.id !== id))
    setProjects(prev => prev.map(p => {
      const assignedIds = { ...p.assignedIds }
      delete assignedIds[id]
      return { ...p, assignedIds }
    }))
  }

  // ── project helpers ───────────────────────────────────────────────────────
  function addProject() {
    setProjects(prev => [...prev, { id: uid(), name: '', weeks: '1', assignedIds: {} }])
  }

  function removeProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  function updateProject(id, field, value) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function toggleAssign(projectId, empId) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const assignedIds = { ...p.assignedIds }
      if (assignedIds[empId]) delete assignedIds[empId]
      else assignedIds[empId] = true
      return { ...p, assignedIds }
    }))
  }

  function updateEmpHoursOnProject(projectId, empId, hours) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      return { ...p, assignedIds: { ...p.assignedIds, [empId]: hours } }
    }))
  }

  // ── totals ────────────────────────────────────────────────────────────────
  const totalWeeklyCost = employees.reduce((sum, e) => sum + weeklyWage(e), 0)
  const totalAnnualCost = totalWeeklyCost * 52
  const markupPct = parseFloat(markup) || 0
  const chargeWeekly = totalWeeklyCost * (1 + markupPct / 100)
  const chargeAnnual = chargeWeekly * 52

  function projectCost(project) {
    const weeks = parseFloat(project.weeks) || 0
    return employees.reduce((sum, emp) => {
      const val = project.assignedIds[emp.id]
      if (!val) return sum
      const hours = parseFloat(val) || 0
      const rate = parseFloat(emp.rate) || 0
      let cost = 0
      if (emp.rateType === 'Hourly') {
        cost = rate * hours * weeks
      } else {
        // salary: pro-rate by hours fraction of standard 40h week
        const weeklyRate = rate / 52
        const fraction = hours / 40
        cost = weeklyRate * fraction * weeks
      }
      return sum + cost
    }, 0)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-mark">⚡</div>
        <div>
          <h1>TimeZap</h1>
          <p className="subtitle">Payroll Cost Estimator</p>
        </div>
      </header>

      {/* ── EMPLOYEE TABLE ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2>Employees</h2>
            <p className="card-desc">Enter each employee's pay information</p>
          </div>
          <button className="btn-primary" onClick={addEmployee}>+ Add Employee</button>
        </div>

        <div className="table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Pay Type</th>
                <th>Rate / Year</th>
                <th>Hrs / Week</th>
                <th>Weekly Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <input
                      className="cell-input"
                      placeholder="Jane Smith"
                      value={emp.name}
                      onChange={e => updateEmployee(emp.id, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      placeholder="Developer"
                      value={emp.role}
                      onChange={e => updateEmployee(emp.id, 'role', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="cell-select"
                      value={emp.rateType}
                      onChange={e => updateEmployee(emp.id, 'rateType', e.target.value)}
                    >
                      {RATE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="input-prefix-wrap">
                      <span className="prefix">$</span>
                      <input
                        className="cell-input prefix"
                        type="number"
                        min="0"
                        placeholder={emp.rateType === 'Hourly' ? '25' : '65000'}
                        value={emp.rate}
                        onChange={e => updateEmployee(emp.id, 'rate', e.target.value)}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      className="cell-input narrow"
                      type="number"
                      min="0"
                      max="168"
                      disabled={emp.rateType === 'Salary'}
                      value={emp.rateType === 'Salary' ? '—' : emp.hoursPerWeek}
                      onChange={e => updateEmployee(emp.id, 'hoursPerWeek', e.target.value)}
                    />
                  </td>
                  <td className="cost-cell">
                    {weeklyWage(emp) > 0 ? currency(weeklyWage(emp)) : <span className="muted">—</span>}
                  </td>
                  <td>
                    <button
                      className="btn-remove"
                      onClick={() => removeEmployee(emp.id)}
                      title="Remove employee"
                      disabled={employees.length === 1}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PAYROLL SUMMARY ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2>Payroll Summary</h2>
            <p className="card-desc">Totals across all {employees.length} employee{employees.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="markup-wrap">
            <label className="markup-label">Markup %</label>
            <div className="input-prefix-wrap">
              <input
                className="cell-input narrow"
                type="number"
                min="0"
                max="500"
                value={markup}
                onChange={e => setMarkup(e.target.value)}
              />
              <span className="suffix">%</span>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard label="Weekly Payroll Cost" value={currency(totalWeeklyCost)} accent={false} />
          <SummaryCard label="Annual Payroll Cost" sublabel="(52 weeks)" value={currency(totalAnnualCost)} accent={false} />
          <SummaryCard label={`Weekly to Charge (${markupPct}% markup)`} value={currency(chargeWeekly)} accent />
          <SummaryCard label={`Annual to Charge (${markupPct}% markup)`} sublabel="(52 weeks)" value={currency(chargeAnnual)} accent />
        </div>
      </section>

      {/* ── PER-EMPLOYEE BREAKDOWN ── */}
      {employees.some(e => weeklyWage(e) > 0) && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Per-Employee Breakdown</h2>
              <p className="card-desc">Cost per person across the year</p>
            </div>
          </div>
          <div className="breakdown-grid">
            {employees.filter(e => weeklyWage(e) > 0).map(emp => {
              const weekly = weeklyWage(emp)
              const annual = weekly * 52
              const chargeW = weekly * (1 + markupPct / 100)
              const chargeA = chargeW * 52
              return (
                <div key={emp.id} className="breakdown-card">
                  <div className="breakdown-name">{emp.name || 'Unnamed'}</div>
                  <div className="breakdown-role">{emp.role || emp.rateType}</div>
                  <div className="breakdown-rows">
                    <div className="breakdown-row">
                      <span>Weekly cost</span><strong>{currency(weekly)}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>Annual cost</span><strong>{currency(annual)}</strong>
                    </div>
                    <div className="breakdown-row accent">
                      <span>Weekly charge</span><strong>{currency(chargeW)}</strong>
                    </div>
                    <div className="breakdown-row accent">
                      <span>Annual charge</span><strong>{currency(chargeA)}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── PROJECT ESTIMATOR ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2>Project Estimator</h2>
            <p className="card-desc">Assign employees to projects and see what to charge</p>
          </div>
          <button className="btn-primary" onClick={addProject}>+ Add Project</button>
        </div>

        {projects.map(project => {
          const cost = projectCost(project)
          const charge = cost * (1 + markupPct / 100)
          const weeks = parseFloat(project.weeks) || 0
          return (
            <div key={project.id} className="project-block">
              <div className="project-header">
                <input
                  className="project-name-input"
                  placeholder="Project name"
                  value={project.name}
                  onChange={e => updateProject(project.id, 'name', e.target.value)}
                />
                <div className="project-weeks-wrap">
                  <label>Duration</label>
                  <div className="input-prefix-wrap">
                    <input
                      className="cell-input narrow"
                      type="number"
                      min="1"
                      value={project.weeks}
                      onChange={e => updateProject(project.id, 'weeks', e.target.value)}
                    />
                    <span className="suffix">wks</span>
                  </div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => removeProject(project.id)}
                  disabled={projects.length === 1}
                  title="Remove project"
                >✕</button>
              </div>

              <div className="project-employees">
                <p className="assign-label">Assign employees &amp; hours/week on this project:</p>
                <div className="assign-grid">
                  {employees.map(emp => {
                    const assigned = !!project.assignedIds[emp.id]
                    const hours = typeof project.assignedIds[emp.id] === 'string'
                      ? project.assignedIds[emp.id]
                      : (assigned ? emp.hoursPerWeek : '')
                    return (
                      <label key={emp.id} className={`assign-chip ${assigned ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={() => {
                            if (!assigned) {
                              updateEmpHoursOnProject(project.id, emp.id, ROLE_DEFAULT_HOURS[emp.role] || emp.hoursPerWeek)
                            } else {
                              toggleAssign(project.id, emp.id)
                            }
                          }}
                        />
                        <span className="chip-name">{emp.name || 'Unnamed'}</span>
                        {assigned && (
                          <div className="chip-hours-wrap" onClick={e => e.preventDefault()}>
                            <input
                              className="chip-hours"
                              type="number"
                              min="1"
                              max="168"
                              value={hours}
                              onChange={e => updateEmpHoursOnProject(project.id, emp.id, e.target.value)}
                            />
                            <span className="chip-hrs-label">hrs/wk</span>
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="project-totals">
                <div className="project-total-item">
                  <span>Labor cost</span>
                  <strong>{cost > 0 ? currency(cost) : '—'}</strong>
                </div>
                <div className="project-total-item accent">
                  <span>Charge client ({markupPct}% markup)</span>
                  <strong>{charge > 0 ? currency(charge) : '—'}</strong>
                </div>
                {weeks > 0 && cost > 0 && (
                  <div className="project-total-item muted">
                    <span>Charge per week</span>
                    <strong>{currency(charge / weeks)}</strong>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <HealthCheck employees={employees} markup={markup} />

      <footer className="app-footer">
        <p>TimeZap · Salary figures calculated over 52 weeks · Hourly figures × hours/week</p>
      </footer>
    </div>
  )
}

function SummaryCard({ label, sublabel, value, accent }) {
  return (
    <div className={`summary-card ${accent ? 'accent' : ''}`}>
      <div className="summary-label">
        {label}
        {sublabel && <span className="summary-sublabel"> {sublabel}</span>}
      </div>
      <div className="summary-value">{value}</div>
    </div>
  )
}
