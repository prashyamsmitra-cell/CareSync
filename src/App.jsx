import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import './App.css'

/* ----------------------------------------------------------------
   CONFIG & HELPERS
---------------------------------------------------------------- */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const storage = {
  get:    (k)    => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set:    (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  clear:  (k)    => localStorage.removeItem(k),
}

const TOKEN_KEY   = 'cs_token'
const PATIENT_KEY = 'cs_patient'

const getToken    = ()    => localStorage.getItem(TOKEN_KEY)
const setToken    = (t)   => localStorage.setItem(TOKEN_KEY, t)
const clearAuth   = ()    => { storage.clear(TOKEN_KEY); storage.clear(PATIENT_KEY) }

const authFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(!(opts.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

const bmiCategory = (bmi) => {
  const n = parseFloat(bmi)
  if (!n)      return { label: 'N/A',         color: '#94a3b8' }
  if (n < 18.5) return { label: 'Underweight', color: '#f59e0b' }
  if (n < 25)   return { label: 'Normal',       color: '#22c55e' }
  if (n < 30)   return { label: 'Overweight',   color: '#f97316' }
  return               { label: 'Obese',         color: '#ef4444' }
}

const fmtBytes = (b) => {
  if (!b) return '0 B'
  const k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

const normalizeDashboardTab = (tab) => {
  const value = String(tab || '').trim().toLowerCase()
  if (!value) return null

  const aliases = {
    home: 'overview',
    overview: 'overview',
    appointment: 'appointments',
    appointments: 'appointments',
    booking: 'appointments',
    bookings: 'appointments',
    diagnosis: 'diagnosis',
    diagnoses: 'diagnosis',
    file: 'files',
    files: 'files',
    upload: 'upload',
    uploads: 'upload',
    chat: 'chat',
  }

  return aliases[value] || null
}

/* ----------------------------------------------------------------
   CONSTANTS
---------------------------------------------------------------- */
const FEATURES = [
  { num:'01', title:'AI Assistance',    accent:'#00b4a0', bg:'rgba(0,180,160,0.07)',  desc:'Clinical intelligence that monitors patient data and delivers evidence-based guidance in real time.' },
  { num:'02', title:'Patient Records',  accent:'#3b82f6', bg:'rgba(59,130,246,0.07)', desc:'Unified health records across all care touchpoints — HIPAA-compliant, end-to-end encrypted.' },
  { num:'03', title:'Smart Monitoring', accent:'#f43f5e', bg:'rgba(244,63,94,0.07)',  desc:'Continuous vitals tracking with intelligent alerting and 360° health profile.' },
]

const fadeUpMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
}

const cardHoverMotion = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  whileHover: { y: -6, scale: 1.01 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
}

const FILE_TYPES = [
  { value: 'prescription', label: 'Prescription', icon: '💊', color: '#00b4a0' },
  { value: 'report',       label: 'Lab Report',   icon: '🧪', color: '#3b82f6' },
  { value: 'scan',         label: 'Scan / X-Ray', icon: '🩻', color: '#8b5cf6' },
  { value: 'other',        label: 'Other',        icon: '📄', color: '#94a3b8' },
]

const addDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const createDemoPatient = () => ({
  id: 'demo-patient',
  pid: 'CSDEMO1',
  name: 'Demo User',
  email: 'demo@caresync.app',
  phone: '+91 98765 43210',
  dob: '1996-08-14T00:00:00.000Z',
  gender: 'Female',
  blood_type: 'O+',
  weight_kg: 62,
  height_cm: 168,
  bmi: '22.0',
  heart_rate: '72',
  blood_pressure: '118/76',
  spo2: '99',
  temperature: '98.4',
  vitals_updated_at: addDays(-1),
  vitals_updated_by: 'Dr. Arjun Mehta',
  created_at: addDays(-120),
})

const DEMO_DOCTORS = [
  { doctor_id: 'doc-1', name: 'Dr. Arjun Mehta', specialization: 'Cardiologist' },
  { doctor_id: 'doc-2', name: 'Dr. Nisha Verma', specialization: 'Pulmonologist' },
  { doctor_id: 'doc-3', name: 'Dr. Rhea Kapoor', specialization: 'General Physician' },
]

const DEMO_FILES = [
  { id: 'file-1', file_name: 'Annual_Blood_Report.pdf', file_type: 'report', file_size: 1543000, upload_date: addDays(-8), notes: 'Routine annual bloodwork summary.' },
  { id: 'file-2', file_name: 'Cardiology_Followup_Prescription.pdf', file_type: 'prescription', file_size: 642000, upload_date: addDays(-4), notes: 'Follow-up prescription after mild chest discomfort.' },
  { id: 'file-3', file_name: 'Chest_Xray_May2026.png', file_type: 'scan', file_size: 2814000, upload_date: addDays(-2), notes: 'Uploaded for demo review in provider workflow.' },
]

const DEMO_TAGS = [
  { id: 'tag-1', tag: 'stable', doctor_name: 'Dr. Rhea Kapoor' },
  { id: 'tag-2', tag: 'follow-up', doctor_name: 'Dr. Arjun Mehta' },
]

const DEMO_DIAGNOSES = [
  {
    id: 'diag-1',
    doctor_name: 'Dr. Rhea Kapoor',
    created_at: addDays(-11),
    diagnosis: 'Mild seasonal viral syndrome with fatigue and congestion. Hydration and observation advised.',
    prescription: 'Paracetamol SOS, steam inhalation, and 3 days of rest.',
    follow_up_date: addDays(5),
  },
  {
    id: 'diag-2',
    doctor_name: 'Dr. Arjun Mehta',
    created_at: addDays(-3),
    diagnosis: 'Intermittent chest tightness likely linked to stress and sleep deprivation. Vitals stable.',
    prescription: 'Lifestyle adjustment, hydration, repeat check if symptoms persist.',
    follow_up_date: addDays(10),
  },
]

const createDemoAppointments = () => ([
  {
    id: 'appt-1',
    doctor_id: 'doc-1',
    doctor_name: 'Dr. Arjun Mehta',
    date: addDays(1),
    time_slot: '10:30 AM',
    reason: 'Follow-up on chest discomfort and sleep-related fatigue.',
    status: 'confirmed',
  },
  {
    id: 'appt-2',
    doctor_id: 'doc-3',
    doctor_name: 'Dr. Rhea Kapoor',
    date: addDays(12),
    time_slot: '04:15 PM',
    reason: 'General wellness review and medication discussion.',
    status: 'pending',
  },
])

const DEMO_PINGS = [
  {
    id: 'ping-1',
    doctor_name: 'Dr. Arjun Mehta',
    message: 'Please keep your latest blood report ready before tomorrow’s consultation.',
  },
]

const createDemoBundle = () => ({
  patient: createDemoPatient(),
  files: DEMO_FILES.map(file => ({ ...file })),
  tags: DEMO_TAGS.map(tag => ({ ...tag })),
  diagnoses: DEMO_DIAGNOSES.map(diagnosis => ({ ...diagnosis })),
  doctors: DEMO_DOCTORS.map(doctor => ({ ...doctor })),
  appointments: createDemoAppointments(),
  pings: DEMO_PINGS.map(ping => ({ ...ping })),
})

/* ----------------------------------------------------------------
   SHARED COMPONENTS
---------------------------------------------------------------- */
function Logo({ size = 34, radius = 10, zoom = 1, fit = 'contain' }) {
  return (
    <div style={{ width:size, height:size, borderRadius:radius, overflow:'hidden', flexShrink:0 }}>
      <img
        src="/logo.jpeg"
        alt="CareSync logo"
        style={{
          width:'100%',
          height:'100%',
          objectFit:fit,
          objectPosition:'center',
          transform:`scale(${zoom})`,
          display:'block',
        }}
      />
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
      {hint  && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function Inp({ error, style: s, ...props }) {
  return (
    <input
      className={`inp${error ? ' inp-err' : ''}`}
      style={s}
      {...props}
    />
  )
}

function PasswordInp({ error, value, onChange, placeholder = '••••••••', name }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <input
        className={`inp${error ? ' inp-err' : ''}`}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        style={{ paddingRight:46 }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--c-muted)', fontSize:'1rem', padding:0, display:'flex', alignItems:'center' }}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

function Spinner({ size = 18, color = '#fff' }) {
  return (
    <span style={{
      display:'inline-block', width:size, height:size,
      border:`2px solid ${color}30`, borderTopColor:color,
      borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0,
    }} />
  )
}

function AppointmentCountBadge({ pid, onBook, count: externalCount = null, demoMode = false }) {
  const [count, setCount] = useState(0)
  const displayCount = externalCount ?? count
  useEffect(() => {
    if (externalCount !== null || demoMode) return
    authFetch('/appointments').then(d => {
      const active = (d.data || []).filter(a => a.status === 'pending' || a.status === 'confirmed')
      setCount(active.length)
    }).catch(()=>{})
  }, [externalCount, demoMode])
  return (
    <div className="welcome-stat" onClick={onBook} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer' }}>
      <p style={{ color:'#fff', fontWeight:700, fontSize:'.9rem' }}>{displayCount} Appointment{displayCount !== 1 ? 's' : ''}</p>
      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'.72rem', marginTop:1 }}>{displayCount === 0 ? 'Book one →' : 'Upcoming'}</p>
    </div>
  )
}

function Alert({ type = 'error', children }) {
  const cfg = {
    error:   { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  color:'#ef4444' },
    success: { bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.25)',  color:'#16a34a' },
    info:    { bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.25)', color:'#3b82f6' },
  }[type]
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:12, padding:'11px 16px', color:cfg.color, fontSize:'.84rem', fontWeight:500 }}>
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------
   AUTH MODAL — Login / Sign Up (2-step)
---------------------------------------------------------------- */
function AuthModal({ onSuccess, onClose }) {
  const [mode,    setMode]    = useState('login')
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiErr,  setApiErr]  = useState('')

  const [loginForm,  setLoginForm]  = useState({ email:'', password:'' })
  const [loginErrs,  setLoginErrs]  = useState({})
  const [signupForm, setSignupForm] = useState({ email:'', password:'', confirmPassword:'', name:'', phone:'', dob:'', gender:'', weight_kg:'', height_cm:'', blood_type:'' })
  const [signupErrs, setSignupErrs] = useState({})

  const setL = (k, v) => { setLoginForm(p  => ({...p, [k]:v})); setLoginErrs(p  => ({...p, [k]:''})); setApiErr('') }
  const setS = (k, v) => { setSignupForm(p => ({...p, [k]:v})); setSignupErrs(p => ({...p, [k]:''})); setApiErr('') }

  const switchMode = (m) => { setMode(m); setStep(1); setApiErr(''); setLoginErrs({}); setSignupErrs({}) }

  /* -- Login -- */
  const handleLogin = async () => {
    const errs = {}
    if (!loginForm.email)    errs.email    = 'Email required'
    if (!loginForm.password) errs.password = 'Password required'
    if (Object.keys(errs).length) { setLoginErrs(errs); return }

    setLoading(true); setApiErr('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setToken(data.data.token)
      storage.set(PATIENT_KEY, data.data.patient)
      onSuccess(data.data.patient)
    } catch (e) { setApiErr(e.message) }
    finally { setLoading(false) }
  }

  /* -- Signup step 1 validation -- */
  const validateStep1 = () => {
    const e = {}
    if (!signupForm.name.trim())       e.name     = 'Full name required'
    if (!signupForm.email.trim())      e.email    = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(signupForm.email)) e.email = 'Enter a valid email'
    if (!signupForm.phone.trim())      e.phone    = 'Phone required'
    if (!signupForm.dob)               e.dob      = 'Date of birth required'
    if (signupForm.password.length < 8) e.password = 'Minimum 8 characters'
    if (signupForm.password !== signupForm.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  /* -- Signup submit -- */
  const handleSignup = async () => {
    setLoading(true); setApiErr('')
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:      signupForm.email,
          password:   signupForm.password,
          name:       signupForm.name,
          phone:      signupForm.phone,
          dob:        signupForm.dob,
          gender:     signupForm.gender     || null,
          weight_kg:  signupForm.weight_kg  || null,
          height_cm:  signupForm.height_cm  || null,
          blood_type: signupForm.blood_type || 'Unknown',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setToken(data.data.token)
      storage.set(PATIENT_KEY, data.data.patient)
      onSuccess(data.data.patient)
    } catch (e) { setApiErr(e.message) }
    finally { setLoading(false) }
  }

  /* -- Live BMI preview -- */
  const liveBMI = signupForm.weight_kg && signupForm.height_cm
    ? (parseFloat(signupForm.weight_kg) / ((parseFloat(signupForm.height_cm) / 100) ** 2)).toFixed(1)
    : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card form-card auth-modal-panel modal-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="auth-modal-header panel-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={30} radius={8} />
            <div>
              <p className="panel-title">
                {mode === 'login' ? 'Welcome back' : step === 1 ? 'Create your account' : 'Health information'}
              </p>
              <p className="panel-subtitle">
                {mode === 'login' ? 'Sign in to your CareSync account'
                  : step === 1 ? 'Step 1 of 2 — Personal details'
                  : 'Step 2 of 2 — Physical metrics'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Toggle */}
        <div className="auth-modal-body">
          <div className="toggle-tabs">
            {['login','signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} className={`toggle-tab${mode === m ? ' active' : ''}`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-content">

          {apiErr && <Alert type="error">{apiErr}</Alert>}

          {/* -- LOGIN -- */}
          {mode === 'login' && (<>
            <Field label="Email address" error={loginErrs.email}>
              <Inp error={loginErrs.email} type="email" placeholder="you@hospital.com" value={loginForm.email} onChange={e => setL('email', e.target.value)} />
            </Field>
            <Field label="Password" error={loginErrs.password}>
              <PasswordInp error={loginErrs.password} value={loginForm.password} onChange={e => setL('password', e.target.value)} />
            </Field>
            <button className="btn" onClick={handleLogin} disabled={loading} style={{ opacity: loading ? .7 : 1 }}>
              {loading ? <><Spinner /> Signing in…</> : 'Sign In →'}
            </button>
          </>)}

          {/* -- SIGNUP STEP 1 -- */}
          {mode === 'signup' && step === 1 && (<>
            <Field label="Full name" error={signupErrs.name}>
              <Inp error={signupErrs.name} placeholder="Sarah Johnson" value={signupForm.name} onChange={e => setS('name', e.target.value)} />
            </Field>
            <Field label="Email address" error={signupErrs.email}>
              <Inp error={signupErrs.email} type="email" placeholder="you@email.com" value={signupForm.email} onChange={e => setS('email', e.target.value)} />
            </Field>
            <Field label="Phone number" error={signupErrs.phone}>
              <Inp error={signupErrs.phone} type="tel" placeholder="+91 98765 43210" value={signupForm.phone} onChange={e => setS('phone', e.target.value)} />
            </Field>
            <div className="input-row">
              <Field label="Date of birth" error={signupErrs.dob}>
                <Inp error={signupErrs.dob} type="date" value={signupForm.dob} onChange={e => setS('dob', e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className="inp" value={signupForm.gender} onChange={e => setS('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </Field>
            </div>
            <Field label="Password" error={signupErrs.password}>
              <PasswordInp error={signupErrs.password} value={signupForm.password} onChange={e => setS('password', e.target.value)} placeholder="Min 8 characters" />
            </Field>
            <Field label="Confirm password" error={signupErrs.confirmPassword}>
              <PasswordInp error={signupErrs.confirmPassword} value={signupForm.confirmPassword} onChange={e => setS('confirmPassword', e.target.value)} placeholder="Re-enter password" />
            </Field>
            <button className="btn" onClick={() => { const e = validateStep1(); if (Object.keys(e).length) { setSignupErrs(e); return } setStep(2) }}>
              Continue →
            </button>
          </>)}

          {/* -- SIGNUP STEP 2 -- */}
          {mode === 'signup' && step === 2 && (<>
            <Alert type="info">Your metrics help us calculate BMI and personalise your dashboard. You can update these later.</Alert>
            <div className="input-row">
              <Field label="Weight (kg)" hint="e.g. 70">
                <Inp type="number" min="20" max="300" placeholder="70" value={signupForm.weight_kg} onChange={e => setS('weight_kg', e.target.value)} />
              </Field>
              <Field label="Height (cm)" hint="e.g. 170">
                <Inp type="number" min="50" max="250" placeholder="170" value={signupForm.height_cm} onChange={e => setS('height_cm', e.target.value)} />
              </Field>
            </div>

            {/* Live BMI preview */}
            {liveBMI && (() => {
              const cat = bmiCategory(liveBMI)
              return (
                <div className="callout-box">
                  <strong style={{ color:cat.color }}>BMI — {cat.label}</strong>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:'2rem', color:cat.color, lineHeight:1 }}>{liveBMI}</div>
                    <div>
                      <p style={{ fontSize:'.85rem', color:'var(--c-dark)', margin:0 }}>Based on entered values</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            <Field label="Blood type">
              <select className="inp" value={signupForm.blood_type} onChange={e => setS('blood_type', e.target.value)}>
                {['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div className="form-actions">
              <button className="btn-ow" onClick={() => setStep(1)}>← Back</button>
              <button className="btn" onClick={handleSignup} disabled={loading} style={{ opacity: loading ? .7 : 1 }}>
                {loading ? <><Spinner /> Creating account…</> : 'Create Account →'}
              </button>
            </div>
          </>)}

          <p style={{ textAlign:'center', fontSize:'.79rem', color:'var(--c-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <span style={{ color:'var(--c-teal)', fontWeight:700, cursor:'pointer' }} onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   DRAG & DROP FILE UPLOADER
---------------------------------------------------------------- */
function FileUploader({ pid, onUploaded }) {
  const [dragging,  setDragging]  = useState(false)
  const [fileType,  setFileType]  = useState('prescription')
  const [notes,     setNotes]     = useState('')
  const [queued,    setQueued]    = useState([])   // File[] pending upload
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [result,    setResult]    = useState(null) // { success, message }
  const inputRef = useRef(null)

  const addFiles = (incoming) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf']
    const valid   = Array.from(incoming).filter(f => {
      if (!allowed.includes(f.type)) { alert(`${f.name}: unsupported type`); return false }
      if (f.size > 10 * 1024 * 1024) { alert(`${f.name}: exceeds 10 MB limit`); return false }
      return true
    })
    setQueued(q => [...q, ...valid])
    setResult(null)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const removeQueued = (i) => setQueued(q => q.filter((_, idx) => idx !== i))

  const handleUpload = async () => {
    if (!queued.length) return
    setUploading(true); setProgress(0); setResult(null)

    const form = new FormData()
    queued.forEach(f => form.append('files', f))
    form.append('file_type', fileType)
    form.append('notes',     notes)

    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          const d = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) resolve(d)
          else reject(new Error(d.message || 'Upload failed'))
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('POST', `${API}/files/upload`)
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
        xhr.send(form)
      })
      setResult({ success:true, message:`${queued.length} file(s) uploaded successfully.` })
      setQueued([]); setNotes('')
      onUploaded()
    } catch (e) {
      setResult({ success:false, message: e.message })
    } finally {
      setUploading(false); setProgress(0)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Type selector */}
      <div className="file-type-grid">
        {FILE_TYPES.map(ft => (
          <button key={ft.value} onClick={() => setFileType(ft.value)} className={`file-type-button${fileType === ft.value ? ' active' : ''}`}>
            <span style={{ fontSize:'1.2rem' }}>{ft.icon}</span>
            <span>{ft.label}</span>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className="upload-dropzone"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display:'none' }} onChange={e => addFiles(e.target.files)} />
        <div style={{ fontSize:'2rem', marginBottom:10 }}>📤</div>
        <p style={{ fontWeight:600, color:'var(--c-dark)', marginBottom:4 }}>
          {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p style={{ fontSize:'.78rem', color:'var(--c-muted)' }}>JPEG, PNG, WebP, PDF · Max 10 MB per file · Up to 5 files</p>
      </div>

      {/* Queued files */}
      {queued.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {queued.map((f, i) => (
            <div key={i} className="upload-item">
              <span style={{ fontSize:'1.1rem' }}>{f.type === 'application/pdf' ? '📕' : '🗂️'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:'.84rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{f.name}</p>
                <p style={{ fontSize:'.72rem', color:'var(--c-muted)', margin:0 }}>{fmtBytes(f.size)}</p>
              </div>
              <button onClick={() => removeQueued(i)} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'.95rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <textarea
        className="inp"
        rows={2}
        placeholder="Add a note (optional) — e.g. 'Post-surgery follow-up report'"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      {uploading && (
        <div className="upload-progress">
          <div className="upload-progress-fill" style={{ width:`${progress}%` }} />
        </div>
      )}

      {result && <Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert>}

      <button className="btn" onClick={handleUpload} disabled={uploading || !queued.length} style={{ padding:'14px', justifyContent:'center', fontSize:'.95rem', borderRadius:14, gap:8, opacity: (uploading || !queued.length) ? .5 : 1 }}>
        {uploading ? <><Spinner /> Uploading… {progress}%</> : `Upload ${queued.length ? `${queued.length} File${queued.length > 1 ? 's' : ''}` : 'Files'}`}
      </button>
    </div>
  )
}

/* ----------------------------------------------------------------
   FILE LIBRARY — Shows uploaded files
---------------------------------------------------------------- */
function FileLibrary({ files, loading, onDelete, onRefresh, readOnly = false }) {
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (file) => {
    if (readOnly) return
    if (!confirm(`Delete "${file.file_name}"?`)) return
    setDeleting(file.id)
    try {
      await authFetch(`/files/${file.id}`, { method:'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
    finally { setDeleting(null) }
  }

  if (loading) return (
    <div className="dashboard-empty-state dashboard-empty">
      <Spinner size={28} color="var(--c-teal)" />
      <p className="dashboard-empty-copy">Loading files…</p>
    </div>
  )

  if (!files.length) return (
    <div className="dashboard-empty-state dashboard-empty">
      <div className="dashboard-empty-icon">🗃️</div>
      <p className="dashboard-empty-title">No files yet</p>
      <p className="dashboard-empty-copy">Upload your first prescription or report above.</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {files.map(f => {
        const ft = FILE_TYPES.find(t => t.value === f.file_type) || FILE_TYPES[3]
        return (
          <div key={f.id} className="dashboard-list-card">
            {/* Top row: icon + name + action buttons */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${ft.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                {ft.icon}
              </div>
              <p style={{ fontWeight:600, fontSize:'.87rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0, color:'#eef5f5' }}>{f.file_name}</p>
              <div style={{ display:'flex', gap:7, flexShrink:0 }}>
                {f.file_url && (
                  <a href={f.file_url} target="_blank" rel="noreferrer" className="icon-button icon-button-view">👁️</a>
                )}
                {!readOnly && (
                  <button onClick={() => handleDelete(f)} disabled={deleting === f.id} className="icon-button icon-button-danger">
                    {deleting === f.id ? <Spinner size={14} color="#ef4444" /> : '🗑️'}
                  </button>
                )}
              </div>
            </div>
            {/* Bottom row: metadata */}
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, marginTop:8, paddingLeft:52 }}>
              <span style={{ fontSize:'.7rem', fontWeight:600, color:ft.color, background:`${ft.color}12`, borderRadius:50, padding:'2px 8px' }}>{ft.label}</span>
              <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>{fmtBytes(f.file_size)}</span>
              <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>·</span>
              <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>{fmtDate(f.upload_date)}</span>
              {f.notes && <span style={{ fontSize:'.71rem', color:'var(--c-muted)', fontStyle:'italic', width:'100%', marginTop:1 }}>"{f.notes}"</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------
   AI CHATBOT PANEL
---------------------------------------------------------------- */
function ChatBot({ patient, onClose, onNavigate, demoMode = false }) {
  const [msgs,   setMsgs]   = useState([{ role:'ai', text:"Hi! I'm CareSync AI, your clinical assistant. Describe your symptoms and I'll help you understand them and suggest the right doctor.", doctor:null }])
  const [inp,    setInp]    = useState('')
  const [typing, setTyping] = useState(false)
  const [sessId, setSessId] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, typing])



  const send = async () => {
    if (!inp.trim() || typing) return
    const txt = inp.trim()
    setMsgs(m => [...m, { role:'user', text:txt, doctor:null }])
    setInp(''); setTyping(true)
    if (demoMode) {
      window.setTimeout(() => {
        const lower = txt.toLowerCase()
        let reply = 'This is a frontend-only demo response. In the live product, CareSync AI would analyse your message through the backend and guide you to the right next step.'
        let doctor = null
        let redirect = 'files'

        if (lower.includes('chest') || lower.includes('heart')) {
          reply = 'For this demo, I would recommend a cardiology follow-up. You can jump to appointments to see how booking looks in the UI.'
          doctor = DEMO_DOCTORS[0]
          redirect = 'appointments'
        } else if (lower.includes('breath') || lower.includes('cough')) {
          reply = 'This looks like a pulmonology-style workflow in the demo. I can point you to a specialist booking flow.'
          doctor = DEMO_DOCTORS[1]
          redirect = 'appointments'
        } else if (lower.includes('report') || lower.includes('file') || lower.includes('upload')) {
          reply = 'You can review the file library and upload experience from the demo dashboard. Upload is intentionally disabled here because this mode is frontend-only.'
          redirect = 'files'
        } else if (lower.includes('diagnosis') || lower.includes('prescription')) {
          reply = 'I can take you to the diagnosis timeline so you can preview how doctor notes and treatment history appear to patients.'
          redirect = 'diagnosis'
        }

        setMsgs(m => [...m, { role:'ai', text:reply, doctor, redirect }])
        setTyping(false)
      }, 650)
      return
    }
    try {
      const data = await authFetch('/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message:txt, session_id: sessId }),
      })
      setSessId(data.data.session_id)
      const { reply, doctor, redirect } = data.data
      const nextTab = normalizeDashboardTab(redirect)
      setMsgs(m => [...m, { role:'ai', text:reply, doctor: doctor || null, redirect: nextTab }])
    } catch (e) {
      setMsgs(m => [...m, { role:'ai', text:'Sorry, I had trouble responding. Please try again.', doctor:null }])
    } finally { setTyping(false) }
  }

  // Quick suggestion chips
  const chips = ['I have chest pain', 'Frequent headaches', 'Breathing difficulty', 'Joint pain', 'High blood sugar', 'Persistent fever']

  return (
<div className="chat-wrapper">
      <div className="chat-backdrop" onClick={onClose} />
      <div className="chat-panel">

        {/* Header */}
        <div className="chat-header panel-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:13, background:'rgba(0,180,160,0.2)', border:'1px solid rgba(0,180,160,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🤖</div>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.9rem' }}>CareSync AI</p>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }} />
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.68rem' }}>Online · Clinical Assistant</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10 }}>

          {/* Quick chips — only shown when just the welcome message exists */}
          {msgs.length === 1 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:4 }}>
              {chips.map(c => (
                <button key={c} onClick={() => { setInp(c); }} className="chat-chip">{c}</button>
              ))}
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i}>
              {/* Message bubble */}
              <div style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:7 }}>
                {m.role === 'ai' && (
                  <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.6rem', fontWeight:800, flexShrink:0 }}>AI</div>
                )}
                <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:16, fontSize:'.84rem', lineHeight:1.65, whiteSpace:'pre-line', ...(m.role === 'user'
                  ? { background:'linear-gradient(135deg,#00b4a0,#00d4c8)', color:'#fff', borderBottomRightRadius:4 }
                  : { background:'rgba(255,255,255,0.06)', color:'#eef5f5', border:'1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius:4, boxShadow:'0 8px 22px rgba(0,0,0,0.18)' }
                )}}>
                  {m.text}
                </div>
              </div>

              {/* Navigation redirect hint */}
              {m.role === 'ai' && m.redirect && !m.doctor && (
                <div style={{ marginTop:8, marginLeft:33 }}>
                  <button
                    onClick={() => { if(onNavigate) onNavigate(m.redirect, m.doctor || null); onClose(); }}
                    style={{ padding:'8px 18px', borderRadius:50, background:'linear-gradient(135deg,#00b4a0,#00897b)', border:'none', color:'#fff', fontWeight:700, fontSize:'.78rem', cursor:'pointer', fontFamily:'var(--font-b)' }}
                  >
                    Go to {m.redirect.charAt(0).toUpperCase() + m.redirect.slice(1)} →
                  </button>
                </div>
              )}

              {/* Doctor suggestion card */}
              {m.role === 'ai' && m.doctor && (
                <div style={{ marginTop:8, marginLeft:33, padding:'12px 14px', borderRadius:14, background:'linear-gradient(135deg,rgba(0,180,160,0.12),rgba(0,212,200,0.06))', border:'1.5px solid rgba(0,180,160,0.25)' }}>
                  <p style={{ fontSize:'.72rem', color:'var(--c-muted)', marginBottom:6, fontWeight:600 }}>SUGGESTED SPECIALIST</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#00b4a0,#00897b)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'.8rem', flexShrink:0 }}>
                      {(m.doctor.name || 'Doctor').split(' ').slice(-1)[0][0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:'.84rem', color:'#eef5f5' }}>{m.doctor.name || 'Recommended doctor'}</p>
                      <p style={{ fontSize:'.74rem', color:'var(--c-muted)' }}>{m.doctor.specialization || m.doctor.spec || 'Specialist'}</p>
                    </div>
                    <button
                      className="btn"
                      style={{ padding:'6px 14px', fontSize:'.75rem', borderRadius:50 }}
                      onClick={() => { if(onNavigate) onNavigate('appointments', m.doctor); onClose(); }}
                    >
                      Book →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.6rem', fontWeight:800, flexShrink:0 }}>AI</div>
              <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, borderBottomLeftRadius:4, padding:'12px 16px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(j => <div key={j} className={`d${j+1}`} style={{ width:6, height:6, borderRadius:'50%', background:'var(--c-teal)' }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="chat-footer">
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Describe your symptoms…"
              value={inp}
              onChange={e => setInp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="btn" onClick={send} disabled={typing} style={{ width:36, height:36, padding:0, borderRadius:50, justifyContent:'center', flexShrink:0, opacity: typing ? 0.5 : 1 }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width:14, height:14 }}><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          <p style={{ textAlign:'center', fontSize:'.64rem', color:'rgba(255,255,255,0.34)', marginTop:6 }}>CareSync AI · For informational purposes only · Not a substitute for medical advice</p>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   DASHBOARD — Per-patient, personalised
---------------------------------------------------------------- */
function Dashboard({ patient, onLogout, demoMode = false, onPatientChange, demoData = null, onDemoDataChange, onOpenManual }) {
  const [activeTab, setActiveTab]   = useState('overview')
  const [chat,      setChat]        = useState(false)
  const [preselectDoctor, setPreselectDoctor] = useState(null)
  const [editPhysical, setEditPhysical] = useState(false)
  const [editForm,     setEditForm]     = useState({})
  const [editSaving,   setEditSaving]   = useState(false)
  const [editResult,   setEditResult]   = useState(null)

  const openEdit = () => {
    setEditForm({
      weight_kg:  patient?.weight_kg  || '',
      height_cm:  patient?.height_cm  || '',
      blood_type: patient?.blood_type || '',
      gender:     patient?.gender     || '',
      phone:      patient?.phone      || '',
    })
    setEditResult(null)
    setEditPhysical(true)
  }

  const saveEdit = async () => {
    if (demoMode) {
      const weight = parseFloat(editForm.weight_kg)
      const height = parseFloat(editForm.height_cm)
      const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : patient?.bmi
      const nextPatient = {
        ...patient,
        ...editForm,
        bmi,
      }
      if (onPatientChange) onPatientChange(nextPatient)
      if (onDemoDataChange) onDemoDataChange(prev => ({ ...prev, patient: nextPatient }))
      setEditResult({ success: true, message: 'Demo profile updated locally.' })
      setTimeout(() => setEditPhysical(false), 900)
      return
    }
    setEditSaving(true); setEditResult(null)
    try {
      const res = await authFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (onPatientChange) onPatientChange(res.data)
      storage.set('cs_patient', res.data)
      setEditResult({ success: true, message: 'Profile updated successfully!' })
      setTimeout(() => setEditPhysical(false), 1200)
    } catch(e) {
      setEditResult({ success: false, message: e.message })
    } finally { setEditSaving(false) }
  }
  const [otpPopup,  setOtpPopup]    = useState(null)

  // Global OTP notification polling — visible on ALL tabs
  useEffect(() => {
    if (demoMode) return
    const poll = async () => {
      try {
        const d = await authFetch('/appointments/otp-notification')
        if (d.data?.plain_otp) setOtpPopup(d.data)
      } catch(e){}
    }
    poll()
    const iv = setInterval(poll, 1500)
    return () => clearInterval(iv)
  }, [])
  const [files,     setFiles]       = useState([])
  const [filesLoading, setFilesLoading] = useState(false)

  const initials = (patient?.name || 'JD').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const bmi      = patient?.bmi
  const bmiCat   = bmiCategory(bmi)

  const fetchFiles = async () => {
    if (demoMode) {
      setFiles(demoData?.files || [])
      return
    }
    setFilesLoading(true)
    try {
      const data = await authFetch('/files')
      setFiles(data.data || [])
    } catch (e) { console.error(e) }
    finally { setFilesLoading(false) }
  }

  useEffect(() => {
    if (demoMode) {
      setFiles(demoData?.files || [])
      return
    }
    if (activeTab === 'files') fetchFiles()
  }, [activeTab, demoMode, demoData])

  const TABS = [
    { id:'overview',      label:'Overview',     icon:'🏠' },
    { id:'appointments',  label:'Appointments', icon:'📅' },
    { id:'diagnosis',     label:'Diagnosis',    icon:'🩺' },
    { id:'files',         label:'Files',        icon:'📁' },
    { id:'upload',        label:'Upload',       icon:'📤'  },
    { id:'chat',          label:'AI Chat',      icon:'🤖'   },
  ]

  return (
    <div className="app-dashboard" style={{ minHeight:'100vh', background:'var(--c-bg)', paddingTop:76 }}>

      {/* Desktop Navbar */}
      <nav className="app-dashboard-nav" style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(9,16,18,0.88)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)', height:72 }}>
        <div className="dash-nav-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'0 28px', height:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <Logo size={48} radius={12} zoom={1.18} fit="cover" />
          </div>
          {/* Desktop tabs */}
          <div className="desktop-tabs" style={{ display:'flex', gap:4 }}>
            {TABS.filter(t => t.id !== 'chat').map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:50, border:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.83rem', transition:'all .2s', background: activeTab === t.id ? 'rgba(31,227,229,0.14)' : 'transparent', color: activeTab === t.id ? 'var(--c-cyan)' : 'rgba(255,255,255,0.44)' }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn desktop-tabs" style={{ padding:'8px 18px', fontSize:'.82rem', display:'inline-flex' }} onClick={() => setChat(true)}>🤖 AI Chat</button>
            <button className="btn-o desktop-tabs" style={{ padding:'8px 18px', fontSize:'.82rem' }} onClick={onOpenManual}>User Manual</button>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:50, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.06)', cursor:'pointer' }} onClick={onLogout}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'.78rem' }}>{initials}</div>
              <span className="desktop-tabs" style={{ display:'inline', fontSize:'.8rem', fontWeight:600, color:'rgba(255,255,255,0.68)' }}>{demoMode ? 'Exit demo' : 'Sign out'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={'mobile-nav-btn' + ((activeTab === t.id && t.id !== 'chat') || (t.id === 'chat' && chat) ? ' active' : '')}
              onClick={() => { if (t.id === 'chat') { setChat(true) } else { setActiveTab(t.id); setChat(false) } }}
            >
              <span>{t.icon}</span>
              <span style={{ color: (activeTab === t.id && t.id !== 'chat') || (t.id === 'chat' && chat) ? 'var(--c-teal)' : 'var(--c-muted)' }}>{t.label}</span>
            </button>
          ))}
          <button className="mobile-nav-btn" onClick={onOpenManual}>
            <span>📘</span>
            <span style={{ color:'var(--c-muted)' }}>Manual</span>
          </button>
          <button className="mobile-nav-btn" onClick={onLogout}>
            <span>🚪</span>
            <span style={{ color:'var(--c-muted)' }}>Out</span>
          </button>
        </div>
      </nav>

      <div className="dashboard-content" style={{ maxWidth:1280, margin:'0 auto', padding:'24px 28px 60px' }}>

        {/* -- OVERVIEW TAB -- */}
        {activeTab === 'overview' && (
          <>
            {/* Welcome banner */}
            <motion.div className="welcome-banner" {...fadeUpMotion} style={{ borderRadius:24, overflow:'hidden', marginBottom:26, position:'relative', background:'linear-gradient(135deg,#060d1f 0%,#0a2428 60%,#061a1a 100%)', padding:'36px 44px' }}>
              <div className="dotgrid" style={{ position:'absolute', inset:0, opacity:.35 }} />
              <div style={{ position:'absolute', top:-50, right:-50, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,180,160,0.22) 0%,transparent 70%)' }} />
              <div style={{ position:'relative', zIndex:1 }}>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'.8rem', fontWeight:500, marginBottom:4, letterSpacing:'.04em', textTransform:'uppercase' }}>Good afternoon ☀️</p>
                <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'clamp(1.5rem,3vw,2rem)', color:'#fff', marginBottom:6 }}>
                  Welcome back, <span className="gt">{patient?.name?.split(' ')[0]}</span>
                </h1>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.85rem', marginBottom:22 }}>
                  Patient ID: <span style={{ color:'var(--c-cyan)', fontWeight:700, fontFamily:'var(--font-h)' }}>{patient?.pid}</span>
                  &nbsp;·&nbsp; Your health summary is looking great.
                </p>
                {demoMode && (
                  <div className="demo-banner">
                    Demo mode is running entirely in the frontend. Data is mocked for presentation only and does not touch your backend.
                  </div>
                )}
                <div className="welcome-stats" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[
                    [`${files.filter(f=>f).length} Files`, 'Uploaded'],
                  ].map(([v, l]) => (
                    <div className="welcome-stat" key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ color:'#fff', fontWeight:700, fontSize:'.9rem' }}>{v}</p>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'.72rem', marginTop:1 }}>{l}</p>
                    </div>
                  ))}
                  <AppointmentCountBadge
                    pid={patient?.pid}
                    onBook={() => setActiveTab('appointments')}
                    count={demoMode ? (demoData?.appointments || []).filter(a => a.status === 'pending' || a.status === 'confirmed').length : null}
                    demoMode={demoMode}
                  />
                </div>
              </div>
            </motion.div>

            <div className="dashboard-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:22 }}>
              {/* Left column */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

                {/* Physical stats */}
                <motion.div className="card" {...cardHoverMotion} style={{ padding:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                    <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem' }}>Physical Profile</h2>
                    <button onClick={openEdit} style={{ fontSize:'.78rem', color:'var(--c-teal)', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Edit ✏️</button>
                  </div>
                  <div className="physical-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                    {[
                      { label:'Weight',     value: patient?.weight_kg ? `${patient.weight_kg}` : '—', unit:'kg',   icon:'⚖️',  color:'#6366f1' },
                      { label:'Height',     value: patient?.height_cm ? `${patient.height_cm}` : '—', unit:'cm',   icon:'📏',  color:'#0ea5e9' },
                      { label:'BMI',        value: bmi ? `${bmi}` : '—',                              unit: bmiCat.label, icon:'📊', color: bmiCat.color },
                      { label:'Blood Type', value: patient?.blood_type || '—',                          unit:'',    icon:'🩸',  color:'#f43f5e' },
                    ].map((m, i) => (
                      <div key={i} style={{ background:`${m.color}0e`, borderRadius:16, padding:'18px 14px', textAlign:'center', border:`1px solid ${m.color}22`, transition:'transform .2s', cursor:'default' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize:'1.3rem', marginBottom:6 }}>{m.icon}</div>
                        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.3rem', color:m.color, lineHeight:1 }}>{m.value}</div>
                        <div style={{ fontSize:'.7rem', color: i === 2 ? m.color : 'var(--c-muted)', fontWeight: i === 2 ? 700 : 400, marginTop:4 }}>{m.unit || m.label}</div>
                        {i !== 2 && <div style={{ fontSize:'.68rem', color:'var(--c-muted)', marginTop:2 }}>{m.label}</div>}
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Vital signs — real values from DB */}
                <motion.div className="card" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: 0.06 }} style={{ padding:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                    <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem' }}>Vital Signs</h2>
                    {patient?.vitals_updated_at
                      ? <span style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a', fontWeight:700, fontSize:'.7rem', padding:'4px 12px', borderRadius:50, border:'1px solid rgba(34,197,94,0.2)' }}>UPDATED</span>
                      : <span style={{ background:'rgba(148,163,184,0.12)', color:'#64748b', fontWeight:700, fontSize:'.7rem', padding:'4px 12px', borderRadius:50, border:'1px solid rgba(148,163,184,0.25)' }}>SET BY DOCTOR</span>
                    }
                  </div>
                  <div className="vitals-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                    {[
                      { label:'Heart Rate',     unit:'bpm',  icon:'❤️', color:'#f43f5e', val: patient?.heart_rate     },
                      { label:'Blood Pressure', unit:'mmHg', icon:'🫀', color:'#6366f1', val: patient?.blood_pressure },
                      { label:'SpO2',           unit:'%',    icon:'🫁', color:'#3b82f6', val: patient?.spo2           },
                      { label:'Temperature',    unit:'°F',   icon:'🌡️', color:'#f59e0b', val: patient?.temperature    },
                    ].map(m => (
                      <div key={m.label} style={{ background: m.val ? `${m.color}08` : 'rgba(0,0,0,0.02)', borderRadius:16, padding:'18px 14px', textAlign:'center', border:`1px solid ${m.val ? m.color+'25' : 'rgba(0,0,0,0.06)'}` }}>
                        <div style={{ fontSize:'1.3rem', color:m.color, marginBottom:5, opacity: m.val ? 1 : .4 }}>{m.icon}</div>
                        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.25rem', color: m.val ? 'var(--c-dark)' : 'var(--c-muted)' }}>{m.val || '—'}</div>
                        <div style={{ fontSize:'.7rem', color:'var(--c-muted)', marginTop:2 }}>{m.unit} · {m.label}</div>
                        <div style={{ fontSize:'.68rem', fontWeight:600, marginTop:5, color: m.val ? '#16a34a' : '#94a3b8' }}>{m.val ? 'On record' : 'Awaiting'}</div>
                      </div>
                    ))}
                  </div>
                  {patient?.vitals_updated_at && (
                    <p style={{ fontSize:'.72rem', color:'var(--c-muted)', marginTop:14, textAlign:'center' }}>
                      Last updated by {patient?.vitals_updated_by} · {fmtDate(patient?.vitals_updated_at)}
                    </p>
                  )}
                  {!patient?.vitals_updated_at && (
                    <p style={{ fontSize:'.74rem', color:'var(--c-muted)', marginTop:16, textAlign:'center', padding:'10px 14px', background:'rgba(0,0,0,0.03)', borderRadius:10 }}>
                      🩺 Vital signs are recorded by your doctor during a consultation
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Right column */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

                {/* Patient info card */}
                <motion.div className="card" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: 0.1 }} style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                    <div style={{ width:56, height:56, borderRadius:18, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'1.15rem', boxShadow:'0 6px 20px rgba(0,180,160,0.3)' }}>{initials}</div>
                    <div>
                      <p style={{ fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.95rem' }}>{patient?.name}</p>
                      <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:2 }}>{patient?.email}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:16, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                    {[
                      ['Patient ID', patient?.pid],
                      ['Phone',      patient?.phone],
                      ['DOB',        fmtDate(patient?.dob)],
                      ['Gender',     patient?.gender || '—'],
                      ['Member since', fmtDate(patient?.created_at)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:'.76rem', color:'var(--c-muted)' }}>{k}</span>
                        <span style={{ fontSize:'.78rem', fontWeight:600, color:'var(--c-dark)', textAlign:'right', maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick actions */}
                <motion.div className="card" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: 0.14 }} style={{ padding:22 }}>
                  <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'.95rem', marginBottom:14 }}>Quick Actions</h2>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'Upload Prescription', icon:'📤', tab:'upload' },
                      { label:'View My Files',       icon:'📁', tab:'files'  },
                      { label:'Ask AI Assistant',    icon:'🤖',  tab:null    },
                    ].map(a => (
                      <button key={a.label} onClick={() => a.tab ? setActiveTab(a.tab) : setChat(true)} className="quick-action-button">
                        <span style={{ fontSize:'1rem' }}>{a.icon}</span>
                        <span>{a.label}</span>
                        <span>→</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}

        {/* -- FILES TAB -- */}
        {/* -- DIAGNOSIS TAB — Patient view -- */}
        {activeTab === 'diagnosis' && <PatientDiagnosisTab patient={patient} demoMode={demoMode} demoDiagnoses={demoData?.diagnoses} demoTags={demoData?.tags} />}

        {activeTab === 'files' && (
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
              <div>
                <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.6rem' }}>My Medical Files</h1>
                <p style={{ color:'var(--c-muted)', fontSize:'.85rem', marginTop:4 }}>{files.length} file{files.length !== 1 ? 's' : ''} stored securely</p>
              </div>
              <button className="btn" style={{ padding:'10px 20px', fontSize:'.84rem' }} onClick={() => setActiveTab('upload')}>{demoMode ? 'Preview Upload' : '+ Upload New'}</button>
            </div>
            <div className="card" style={{ padding:24 }}>
              <FileLibrary files={files} loading={filesLoading} onDelete={() => {}} onRefresh={fetchFiles} readOnly={demoMode} />
            </div>
          </div>
        )}

        {/* -- APPOINTMENTS TAB -- */}
        {activeTab === 'appointments' && (
          <AppointmentsTab
            patient={patient}
            preselectDoctor={preselectDoctor}
            onPreselectUsed={() => setPreselectDoctor(null)}
            demoMode={demoMode}
            demoData={demoData}
            onDemoDataChange={onDemoDataChange}
          />
        )}

        {/* -- UPLOAD TAB -- */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth:680, margin:'0 auto' }}>
            <div style={{ marginBottom:22 }}>
              <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.6rem' }}>Upload Documents</h1>
              <p style={{ color:'var(--c-muted)', fontSize:'.85rem', marginTop:4 }}>
                {demoMode
                  ? 'This screen is available in the deployed demo so judges can see the UI, but it stays frontend-only and does not upload anything.'
                  : 'Upload prescriptions, lab reports, scans, or any health-related documents.'}
              </p>
            </div>
            <div className="card" style={{ padding:28 }}>
              {demoMode ? (
                <div className="demo-manual-card" style={{ textAlign:'left' }}>
                  <span className="demo-manual-eyebrow">Frontend-only preview</span>
                  <h3 style={{ fontFamily:'var(--font-h)', fontSize:'1.2rem', margin:'10px 0 8px' }}>Upload flow visible, backend disabled</h3>
                  <p style={{ color:'var(--c-muted)', lineHeight:1.7 }}>
                    In the live product, users can attach reports, scans, and prescriptions here. For tomorrow’s presentation this panel is intentionally non-functional so the deployed site never depends on a suspended API.
                  </p>
                  <div className="manual-step-list" style={{ marginTop:18 }}>
                    {[
                      'Drag-and-drop UI remains visible for walkthroughs and screenshots.',
                      'No files are transmitted, saved, or validated in demo mode.',
                      'The sample files shown in the library are seeded locally in the frontend.',
                    ].map(item => (
                      <div key={item} className="manual-step-item">
                        <div className="manual-step-index">i</div>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <FileUploader pid={patient?.pid} onUploaded={() => { fetchFiles(); setActiveTab('files') }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="btn fab-btn" onClick={() => setChat(true)} style={{ position:'fixed', bottom:32, right:32, width:56, height:56, borderRadius:18, fontSize:'1.3rem', padding:0, justifyContent:'center', boxShadow:'0 10px 30px rgba(0,180,160,0.4)', zIndex:50, animation:'glow 3s ease-in-out infinite' }} title="AI Assistant">🤖</button>

      {/* -- EDIT PHYSICAL PROFILE MODAL -- */}
      {editPhysical && (
        <div className="modal-overlay">
          <div className="card form-card edit-modal modal-panel" style={{ width:'100%', maxWidth:420, overflow:'hidden' }}>
            {/* Header */}
            <div className="edit-modal-header panel-header">
              <div>
                <p className="panel-title">Edit Physical Profile</p>
                <p className="panel-subtitle">BMI will be recalculated automatically</p>
              </div>
              <button onClick={() => setEditPhysical(false)} className="icon-button icon-button-close">×</button>
            </div>
            {/* Form */}
            <div className="edit-modal-body">
              {editResult && <Alert type={editResult.success ? 'success' : 'error'}>{editResult.message}</Alert>}
                <div className="edit-grid">
                {[
                  { key:'weight_kg',  label:'Weight',     placeholder:'e.g. 70',  suffix:'kg',  type:'number' },
                  { key:'height_cm',  label:'Height',     placeholder:'e.g. 170', suffix:'cm',  type:'number' },
                  { key:'blood_type', label:'Blood Type', placeholder:'e.g. O+',  suffix:'',    type:'text'   },
                  { key:'gender',     label:'Gender',     placeholder:'',         suffix:'',    type:'select' },
                  { key:'phone',      label:'Phone',      placeholder:'+91...',   suffix:'',    type:'text',  span:2 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.span ? `span ${f.span}` : 'span 1' }}>
                    <label className="field-label">{f.label}</label>
                          {f.type === 'select' ? (
                      <select className="inp" value={editForm[f.key]} onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))}>
                        <option value="">Select</option>
                        {['Male','Female','Non-binary','Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <div style={{ position:'relative' }}>
                        <input className="inp" type={f.type} placeholder={f.placeholder}
                          value={editForm[f.key]}
                          onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))}
                          style={{ paddingRight: f.suffix ? 40 : undefined }}
                        />
                        {f.suffix && <span className="input-suffix">{f.suffix}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Live BMI preview */}
              {editForm.weight_kg && editForm.height_cm && (
                <div className="callout-box callout-row">
                  <span className="callout-copy">New BMI</span>
                  <span className="callout-value">
                    {(parseFloat(editForm.weight_kg) / ((parseFloat(editForm.height_cm)/100)**2)).toFixed(1)}
                  </span>
                </div>
              )}
              <button className="btn btn-full" onClick={saveEdit} disabled={editSaving} style={{ opacity: editSaving ? .7 : 1 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- GLOBAL OTP POPUP — visible on all tabs -- */}
      {otpPopup && (
        <div style={{ position:'fixed', top:16, right:16, zIndex:999, width:320, borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', animation:'slideIn .3s ease' }}>
          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,#00897B,#00695C)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🔐</div>
              <div>
                <p style={{ color:'#fff', fontWeight:700, fontSize:'.85rem', fontFamily:'var(--font-h)' }}>Doctor Access Request</p>
                <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'.68rem' }}>Share this code verbally</p>
              </div>
            </div>
            <button onClick={() => setOtpPopup(null)} style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>×</button>
          </div>
          {/* OTP code */}
          <div style={{ background:'#fff', padding:'20px 18px' }}>
            <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginBottom:10, textAlign:'center' }}>Your one-time access code</p>
            <div style={{ background:'linear-gradient(135deg,rgba(0,137,123,0.06),rgba(0,180,160,0.03))', border:'2px dashed rgba(0,180,160,0.3)', borderRadius:14, padding:'16px', textAlign:'center', marginBottom:14 }}>
              <p style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:'2.4rem', letterSpacing:'.3em', color:'var(--c-dark)', lineHeight:1 }}>{otpPopup.plain_otp}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <p style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>⏱️ Valid for 10 minutes</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(otpPopup.plain_otp) }}
                style={{ fontSize:'.72rem', color:'var(--c-teal-dim)', fontWeight:600, background:'rgba(0,180,160,0.08)', border:'1px solid rgba(0,180,160,0.2)', borderRadius:50, padding:'3px 10px', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                Copy
              </button>
            </div>
            <p style={{ fontSize:'.7rem', color:'#94a3b8', textAlign:'center', lineHeight:1.5 }}>
              Do not share with anyone other than your doctor
            </p>
            <button onClick={() => setOtpPopup(null)} style={{ width:'100%', marginTop:12, padding:'10px', borderRadius:50, background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'var(--c-muted)', fontWeight:600, fontSize:'.78rem', cursor:'pointer', fontFamily:'var(--font-b)' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {chat && <ChatBot patient={patient} onClose={() => setChat(false)} onNavigate={(tab, doctor=null) => { if(doctor) setPreselectDoctor(doctor); setActiveTab(tab); setChat(false); }} demoMode={demoMode} />}
    </div>
  )
}

/* ----------------------------------------------------------------
   LANDING PAGE
---------------------------------------------------------------- */
function Landing({ onOpenAuth, onDoctorPortal, onTryDemo, onOpenManual }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="app-landing">
      <nav className="landing-nav" style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, transition:'all .3s', background: scrolled ? 'rgba(9,16,18,0.92)' : 'rgba(9,16,18,0.26)', backdropFilter: 'blur(20px)', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent' }}>
        <div className="landing-nav-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <Logo size={48} radius={12} zoom={1.18} fit="cover" />
            <span className="landing-wordmark">CareSync</span>
          </div>
          <div className="landing-nav-links desktop-tabs">
            {[
              ['#home', 'Home'],
              ['#clinical-ai', 'Clinical AI'],
              ['#providers', 'For Providers'],
              ['#security', 'Security'],
            ].map(([href, label], index) => (
              <motion.a
                key={href}
                href={href}
                className="landing-nav-link"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3, delay: 0.04 * index, ease: [0.16, 1, 0.3, 1] }}
              >
                {label}
              </motion.a>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn-ow desktop-tabs" style={{ fontSize:'.92rem', padding:'12px 24px' }} onClick={onDoctorPortal}>Doctor Portal</button>
            <button className="btn-o desktop-tabs" style={{ fontSize:'.92rem', padding:'12px 24px', color:'#fff', borderColor:'rgba(255,255,255,0.22)' }} onClick={onOpenManual}>User Manual</button>
            <button className="btn" style={{ padding:'10px 20px', fontSize:'.82rem' }} onClick={onOpenAuth}>Get Started</button>
          </div>
        </div>
      </nav>

      <section id="home" className="landing-hero-section">
        <div className="landing-grid" style={{ maxWidth:1280, margin:'0 auto', padding:'140px 28px 88px', position:'relative', zIndex:2 }}>
          <div className="landing-copy">
            <div className="pill fu landing-hero-pill">
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4c8', display:'inline-block' }} />
              AI-Powered Clinical Intelligence
            </div>
            <h1 className="fu2 landing-headline">
              Your Health,
              <span> Intelligently Managed</span>
            </h1>
            <p className="fu3 landing-subcopy">
              Experience the next frontier of medical care. CareSync bridges traditional clinical reliability with
              cutting-edge AI, secure patient records, and doctor-verified access workflows.
            </p>
            <div className="fu4 landing-cta-row">
              <button className="btn" style={{ fontSize:'1rem', padding:'15px 34px' }} onClick={onOpenAuth}>Get Started</button>
              <button className="btn-ow" style={{ fontSize:'1rem', padding:'15px 34px' }} onClick={onDoctorPortal}>Doctor Portal</button>
            </div>
            <div className="landing-stat-row fu4">
              {[['Live', 'Patient Data'], ['OTP', 'Doctor Access'], ['HIPAA', 'Aligned Security']].map(([v, l]) => (
                <div key={l}>
                  <strong>{v}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.div className="landing-preview fu3" {...fadeUpMotion} transition={{ ...fadeUpMotion.transition, delay: 0.12 }}>
            <motion.div className="landing-preview-frame" whileHover={{ y: -8, rotate: -1.5 }} transition={{ duration: 0.35 }}>
              <div className="landing-preview-glow" />
              <div className="landing-preview-panel">
                <div className="preview-topbar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="preview-body">
                  <div className="preview-side">
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="preview-main">
                    <div className="preview-wave" />
                    <div className="preview-bars">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="preview-cards">
                      <div />
                      <div />
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-confidence">
                <span>AI Confidence</span>
                <strong>99.8%</strong>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="clinical-ai" className="landing-features-wrap">
        <motion.div className="landing-section-copy" {...fadeUpMotion}>
          <h2>Unrivaled Clinical Intelligence</h2>
          <p>A complete suite of clinical tools designed to elevate every patient interaction without compromising privacy or speed.</p>
        </motion.div>
        <div className="landing-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div key={i} className={`landing-feature-card landing-feature-card-${i + 1}`} {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: i * 0.06 }}>
              <div className="landing-feature-mark">{f.num}</div>
              <div className="landing-feature-icon">
                {f.num === '01' ? '🧠' : f.num === '02' ? '🗂️' : '📈'}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
          <motion.div className="landing-feature-card landing-feature-card-wide" id="security" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: 0.2 }}>
            <div className="landing-feature-icon">🔐</div>
            <h3>Session-based Doctor Access</h3>
            <p>Doctors enter through the dedicated portal, verify the patient with OTP, and access real session-scoped records instead of dummy data.</p>
          </motion.div>
        </div>
      </section>

      <section id="providers" className="landing-info-wrap">
        <motion.div className="landing-section-copy" {...fadeUpMotion}>
          <h2>Built for Providers</h2>
          <p>CareSync is designed around real clinical workflows, giving doctors fast access to live records, patient uploads, and session-bound review tools.</p>
        </motion.div>
        <div className="landing-info-grid">
          {[
            ['OTP Session Access', 'Doctors enter through a dedicated portal, confirm the patient with a one-time code, and work inside a secure timed session.'],
            ['Live Patient Context', 'Vitals, files, diagnoses, and appointments are pulled from your backend in real time instead of placeholder content.'],
            ['Workflow-Ready Actions', 'Request uploads, review appointments, record diagnoses, and continue patient care from one connected interface.'],
          ].map(([title, desc], index) => (
            <motion.div key={title} className="landing-info-card" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: index * 0.07 }}>
              <span className="landing-info-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="security" className="landing-info-wrap landing-info-wrap-tight">
        <motion.div className="landing-section-copy" {...fadeUpMotion}>
          <h2>Security by Design</h2>
          <p>The platform is structured so sensitive access stays intentional, traceable, and patient-approved at every step.</p>
        </motion.div>
        <div className="landing-security-grid">
          {[
            ['Patient-approved doctor access', 'The doctor portal requires a patient-linked OTP before records can be accessed.'],
            ['Real-time protected records', 'Appointments, diagnoses, and uploaded files stay connected to the authenticated session and your existing backend rules.'],
            ['Clinical continuity without dummy data', 'Every visible action is grounded in the live system so the UI reflects the actual care workflow.'],
          ].map(([title, desc], index) => (
            <motion.div key={title} className="landing-security-card" {...cardHoverMotion} transition={{ ...cardHoverMotion.transition, delay: index * 0.08 }}>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={28} radius={8} />
            <span>CareSync</span>
          </div>
        </div>
        <div className="landing-footer-links">
          <a href="#security">Privacy Protocol</a>
          <a href="#clinical-ai">Clinical Accuracy</a>
          <a href="#providers">For Providers</a>
        </div>
      </footer>

      <section className="demo-cta-section">
        <div className="demo-cta-card">
          <div>
            <span className="demo-cta-kicker">Presentation fallback</span>
            <h2>Try for free</h2>
            <p>
              Launch a backend-free Demo User directly from the deployed website and preview the patient dashboard, appointments,
              files, diagnosis history, and AI flow with seeded data.
            </p>
          </div>
          <div className="demo-cta-actions">
            <button className="btn" style={{ fontSize:'.96rem', padding:'15px 28px' }} onClick={onTryDemo}>Enter Demo User</button>
            <button className="btn-ow" style={{ fontSize:'.96rem', padding:'15px 28px', background:'rgba(255,255,255,0.18)', borderColor:'rgba(255,255,255,0.34)', color:'#fff' }} onClick={onOpenManual}>Open User Manual</button>
          </div>
        </div>
      </section>
    </div>
  )
}


/* ----------------------------------------------------------------
   APPOINTMENTS TAB
---------------------------------------------------------------- */

/* ----------------------------------------------------------------
   PATIENT DIAGNOSIS TAB — view doctor diagnoses
---------------------------------------------------------------- */
function PatientDiagnosisTab({ patient, demoMode = false, demoDiagnoses = [], demoTags = [] }) {
  const [diagnoses, setDiagnoses] = useState([])
  const [tags,      setTags]      = useState([])
  const [loading,   setLoading]   = useState(true)

  const TAG_COLORS = {
    'stable':          '#22c55e',
    'follow-up':       '#3b82f6',
    'monitoring':      '#f59e0b',
    'critical':        '#f97316',
    'terminally-ill':  '#ef4444',
    'recovered':       '#00b4a0',
  }

  useEffect(() => {
    if (demoMode) {
      setDiagnoses(demoDiagnoses || [])
      setTags(demoTags || [])
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const [dRes, tRes] = await Promise.all([
          authFetch(`/diagnoses/${patient?.pid}`),
          authFetch(`/diagnoses/tags/${patient?.pid}`).catch(() => ({ data: [] })),
        ])
        setDiagnoses(dRes.data || [])
        setTags(tRes.data || [])
      } catch(e) {}
      finally { setLoading(false) }
    }
    load()
  }, [patient?.pid, demoMode, demoDiagnoses, demoTags])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <Spinner size={32} color="var(--c-teal)" />
    </div>
  )

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>

      {/* Clinical tags */}
      {tags.length > 0 && (
        <div className="card" style={{ padding:22, marginBottom:20 }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'.95rem', marginBottom:14 }}>Clinical Status</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {tags.map(t => (
              <span key={t.id} style={{
                padding:'6px 16px', borderRadius:50, fontWeight:700, fontSize:'.78rem',
                background: `${TAG_COLORS[t.tag] || '#94a3b8'}18`,
                color: TAG_COLORS[t.tag] || '#94a3b8',
                border: `1.5px solid ${TAG_COLORS[t.tag] || '#94a3b8'}40`,
              }}>
                {t.tag.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                <span style={{ fontSize:'.68rem', opacity:.7, marginLeft:6 }}>· {t.doctor_name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnoses list */}
      {diagnoses.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📋</div>
          <p style={{ fontWeight:600, color:'var(--c-dark)', marginBottom:6 }}>No diagnoses yet</p>
          <p style={{ fontSize:'.82rem', color:'var(--c-muted)' }}>Diagnoses added by your doctor during consultations will appear here.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {diagnoses.map((d, i) => (
            <div key={d.id} className="card" style={{ padding:24, borderLeft:`4px solid var(--c-teal)` }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:'.9rem', color:'var(--c-dark)' }}>{d.doctor_name}</p>
                  <p style={{ fontSize:'.74rem', color:'var(--c-muted)', marginTop:2 }}>{fmtDate(d.created_at)}</p>
                </div>
                <span style={{ fontSize:'.72rem', fontWeight:600, color:'var(--c-teal-dim)', background:'rgba(0,180,160,0.08)', border:'1px solid rgba(0,180,160,0.2)', borderRadius:50, padding:'4px 12px' }}>
                  Consultation #{diagnoses.length - i}
                </span>
              </div>

              {/* Diagnosis */}
              <div style={{ marginBottom:12 }}>
                <p style={{ fontSize:'.72rem', fontWeight:700, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Diagnosis</p>
                <p style={{ fontSize:'.88rem', color:'var(--c-dark)', lineHeight:1.6 }}>{d.diagnosis}</p>
              </div>

              {/* Prescription */}
              {d.prescription && (
                <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:10, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)' }}>
                  <p style={{ fontSize:'.72rem', fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Prescription</p>
                  <p style={{ fontSize:'.85rem', color:'var(--c-dark)', lineHeight:1.6 }}>{d.prescription}</p>
                </div>
              )}

              {/* Follow-up */}
              {d.follow_up_date && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <span style={{ fontSize:'.75rem', fontWeight:600, color:'#f59e0b', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:50, padding:'3px 12px' }}>
                    🔁 Follow-up: {fmtDate(d.follow_up_date)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentsTab({ patient, preselectDoctor = null, onPreselectUsed, demoMode = false, demoData = null, onDemoDataChange }) {
  const [doctors,       setDoctors]       = useState([])
  const [appointments,  setAppointments]  = useState([])
  const [showBook,      setShowBook]      = useState(false)
  const [selDoctor,     setSelDoctor]     = useState(null)
  const [selDate,       setSelDate]       = useState('')
  const [availSlots,    setAvailSlots]    = useState([])
  const [selSlot,       setSelSlot]       = useState('')
  const [reason,        setReason]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [slotsLoading,  setSlotsLoading]  = useState(false)
  const [result,        setResult]        = useState(null)
  const [pings,         setPings]         = useState([])


  useEffect(() => {
    if (demoMode) {
      setDoctors(demoData?.doctors || [])
      setAppointments(demoData?.appointments || [])
      setPings(demoData?.pings || [])
      return
    }
    fetchDoctors()
    fetchAppointments()
    fetchPings()
  }, [demoMode, demoData])

  // Auto-open booking form and pre-select doctor from chatbot recommendation
  useEffect(() => {
    if (preselectDoctor && doctors.length > 0) {
      // Match chatbot doctor payloads coming from either the AI service or our own doctors API.
      const match = doctors.find(d =>
        d.doctor_id === preselectDoctor.doctor_id ||
        d.doctor_id === preselectDoctor.id ||
        d.id === preselectDoctor.doctor_id ||
        d.id === preselectDoctor.id ||
        d.name?.toLowerCase() === preselectDoctor.name?.toLowerCase()
      )
      if (match) {
        setSelDoctor(match.doctor_id || match.id)
        setShowBook(true)
        if (onPreselectUsed) onPreselectUsed()
      } else {
        setShowBook(true)
      }
    }
  }, [preselectDoctor, doctors, onPreselectUsed])

  useEffect(() => {
    if (selDoctor && selDate) fetchSlots()
  }, [selDoctor, selDate])

  const fetchDoctors = async () => {
    if (demoMode) { setDoctors(demoData?.doctors || []); return }
    try { const d = await authFetch('/doctors'); setDoctors(d.data || []) } catch(e){}
  }
  const fetchAppointments = async () => {
    if (demoMode) { setAppointments(demoData?.appointments || []); return }
    try { const d = await authFetch('/appointments'); setAppointments(d.data || []) } catch(e){}
  }
  const fetchPings = async () => {
    if (demoMode) { setPings(demoData?.pings || []); return }
    try { const d = await authFetch('/diagnoses/pings/mine'); setPings(d.data || []) } catch(e){}
  }

  const fetchSlots = async () => {
    if (demoMode) {
      setAvailSlots(['09:30 AM', '11:00 AM', '02:15 PM', '04:45 PM'])
      return
    }
    setSlotsLoading(true); setSelSlot('')
    try {
      const d = await authFetch(`/doctors/${selDoctor}/available-slots?date=${selDate}`)
      setAvailSlots(d.available || [])
    } catch(e){ setAvailSlots([]) }
    finally { setSlotsLoading(false) }
  }
  const dismissPing = async (id) => {
    if (demoMode) {
      setPings(prev => prev.filter(p => p.id !== id))
      if (onDemoDataChange) onDemoDataChange(prev => ({ ...prev, pings: prev.pings.filter(p => p.id !== id) }))
      return
    }
    try { await authFetch(`/diagnoses/pings/${id}/read`, { method:'PATCH' }); fetchPings() } catch(e){}
  }
  const bookAppointment = async () => {
    if (!selDoctor || !selDate || !selSlot) return
    if (demoMode) {
      const doctor = doctors.find(d => (d.doctor_id || d.id) === selDoctor)
      const newAppointment = {
        id: `appt-${Date.now()}`,
        doctor_id: selDoctor,
        doctor_name: doctor?.name || 'Selected doctor',
        date: selDate,
        time_slot: selSlot,
        reason,
        status: 'pending',
      }
      const nextAppointments = [newAppointment, ...(demoData?.appointments || [])]
      setAppointments(nextAppointments)
      if (onDemoDataChange) onDemoDataChange(prev => ({ ...prev, appointments: nextAppointments }))
      setResult({ success:true, message:'Demo appointment added locally.' })
      setShowBook(false); setSelDoctor(null); setSelDate(''); setSelSlot(''); setReason('')
      return
    }
    setLoading(true); setResult(null)
    try {
      await authFetch('/appointments', { method:'POST', body: JSON.stringify({ doctor_id:selDoctor, date:selDate, time_slot:selSlot, reason }) })
      setResult({ success:true, message:'Appointment booked successfully!' })
      setShowBook(false); setSelDoctor(null); setSelDate(''); setSelSlot(''); setReason('')
      fetchAppointments()
    } catch(e) { setResult({ success:false, message:e.message }) }
    finally { setLoading(false) }
  }
  const cancelAppointment = async (id) => {
    if (demoMode) {
      const nextAppointments = (demoData?.appointments || []).map(appointment =>
        appointment.id === id ? { ...appointment, status: 'cancelled' } : appointment
      )
      setAppointments(nextAppointments)
      if (onDemoDataChange) onDemoDataChange(prev => ({ ...prev, appointments: nextAppointments }))
      return
    }
    if (!confirm('Cancel this appointment?')) return
    try { await authFetch(`/appointments/${id}/cancel`, { method:'PATCH' }); fetchAppointments() } catch(e){ alert(e.message) }
  }

  const statusColors = { pending:'#f59e0b', confirmed:'#22c55e', completed:'#6366f1', cancelled:'#ef4444' }
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>



      {/* Doctor pings */}
      {pings.length > 0 && (
        <div style={{ marginBottom:20 }}>
          {pings.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:16, marginBottom:10 }}>
              <span style={{ fontSize:'1.3rem' }}>🔔</span>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:'.88rem' }}>Message from {p.doctor_name}</p>
                <p style={{ fontSize:'.8rem', color:'var(--c-muted)', marginTop:2 }}>{p.message}</p>
              </div>
              <button onClick={() => dismissPing(p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-muted)', fontSize:'1.1rem' }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.6rem' }}>Appointments</h1>
          <p style={{ color:'var(--c-muted)', fontSize:'.85rem', marginTop:4 }}>{appointments.filter(a => a.status !== 'cancelled').length} active appointment(s)</p>
        </div>
        <button className="btn" style={{ padding:'10px 20px', fontSize:'.84rem' }} onClick={() => setShowBook(v => !v)}>
          {showBook ? '× Close' : demoMode ? '+ Simulate Booking' : '+ Book Appointment'}
        </button>
      </div>

      {result && <div style={{ marginBottom:16 }}><Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert></div>}

      {/* Booking form */}
      {showBook && (
        <div className="card" style={{ padding:28, marginBottom:24 }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:20 }}>Book New Appointment</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <Field label="Select Doctor">
              <select className="inp" value={selDoctor || ''} onChange={e => setSelDoctor(e.target.value)}>
                <option value="">Choose a doctor…</option>
                {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.specialization}</option>)}
              </select>
            </Field>
            <Field label="Appointment Date">
              <Inp type="date" value={selDate} min={minDate} onChange={e => setSelDate(e.target.value)} disabled={!selDoctor} />
            </Field>
          </div>

          {selDoctor && selDate && (
            <Field label="Available Time Slots" hint="Select an available slot">
              {slotsLoading ? <p style={{ color:'var(--c-muted)', fontSize:'.85rem' }}>Loading slots…</p>
                : availSlots.length === 0 ? <p style={{ color:'#ef4444', fontSize:'.85rem' }}>No slots available on this date. Try another day.</p>
                : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
                    {availSlots.map(s => (
                      <button key={s} onClick={() => setSelSlot(s)} style={{ padding:'8px 16px', borderRadius:50, border:`1.5px solid ${selSlot === s ? 'var(--c-teal)' : 'rgba(255,255,255,0.1)'}`, background: selSlot === s ? 'rgba(0,180,160,0.16)' : 'rgba(255,255,255,0.04)', color: selSlot === s ? 'var(--c-cyan)' : '#dce8e8', fontWeight:600, fontSize:'.82rem', cursor:'pointer', transition:'all .2s' }}>{s}</button>
                    ))}
                  </div>
                )
              }
            </Field>
          )}

          <div style={{ marginTop:16 }}>
            <Field label="Reason for visit (optional)">
              <textarea className="inp" rows={2} style={{ resize:'none' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Brief description of your concern…" />
            </Field>
          </div>

          <button className="btn" onClick={bookAppointment} disabled={loading || !selDoctor || !selDate || !selSlot} style={{ marginTop:18, padding:'13px 28px', justifyContent:'center', opacity: (!selDoctor || !selDate || !selSlot) ? .5 : 1, gap:8 }}>
            {loading ? <><Spinner /> Booking…</> : 'Confirm Booking'}
          </button>
        </div>
      )}

      {/* Appointments list */}
      <div className="card" style={{ padding:24 }}>
        {appointments.length === 0 ? (
          <div className="dashboard-empty-state" style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📅</div>
            <p style={{ fontWeight:600 }}>No appointments yet</p>
            <p style={{ fontSize:'.82rem', marginTop:4 }}>Book your first appointment above.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {appointments.map(a => (
              <div key={a.id} className="dashboard-list-card" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:46, height:46, borderRadius:14, background:'rgba(0,180,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>🩺</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:'.9rem', color:'#eef5f5' }}>{a.doctor_name}</p>
                  <p style={{ fontSize:'.78rem', color:'var(--c-muted)', marginTop:2 }}>{new Date(a.date).toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })} · {a.time_slot}</p>
                  {a.reason && <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:2, fontStyle:'italic' }}>"{a.reason}"</p>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:'.72rem', fontWeight:700, color: statusColors[a.status] || '#94a3b8', background:`${statusColors[a.status]}15`, borderRadius:50, padding:'3px 10px', textTransform:'uppercase', letterSpacing:'.04em' }}>{a.status}</span>
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <button onClick={() => cancelAppointment(a.id)} style={{ fontSize:'.72rem', color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   DOCTOR LOGIN — OTP flow
---------------------------------------------------------------- */
function DoctorLogin({ onSuccess, onBack }) {
  const [doctors,    setDoctors]    = useState([])
  const [step,       setStep]       = useState(1)  // 1=select doctor+pid, 2=enter otp
  const [doctorId,   setDoctorId]   = useState('')
  const [pid,        setPid]        = useState('')
  const [otp,        setOtp]        = useState('')
  const [patientInfo, setPatientInfo] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    fetch(`${API}/doctors`).then(r => r.json()).then(d => setDoctors(d.data || [])).catch(()=>{})
  }, [])

  const requestOTP = async () => {
    if (!doctorId || !pid.trim()) { setError('Please select your name and enter a patient PID.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/doctors/otp/request`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ doctor_id: doctorId, pid: pid.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setPatientInfo(data.data)
      setStep(2)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const verifyOTP = async () => {
    if (!otp.trim()) { setError('Please enter the OTP.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/doctors/otp/verify`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ doctor_id: doctorId, pid: pid.trim().toUpperCase(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      // Store doctor token separately
      localStorage.setItem('cs_doctor_token', data.data.token)
      onSuccess(data.data)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#060d1f,#0a2428)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:460, background:'rgba(255,255,255,0.97)', borderRadius:28, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.4)' }}>
        <div style={{ background:'linear-gradient(135deg,#060d1f,#0a2428)', padding:'26px 30px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
            <Logo size={46} radius={12} zoom={1.18} fit="cover" />
          </div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'.8rem' }}>
            {step === 1 ? 'Doctor Portal — Step 1 of 2: Identify yourself and patient' : 'Doctor Portal — Step 2 of 2: Enter OTP from patient'}
          </p>
        </div>
        <div style={{ padding:'26px 30px 30px', display:'flex', flexDirection:'column', gap:16 }}>
          {error && <Alert type="error">{error}</Alert>}

          {step === 1 && (<>
            <Field label="Your name">
              <select className="inp" value={doctorId} onChange={e => setDoctorId(e.target.value)} style={{ background:'rgba(255,255,255,0.9)' }}>
                <option value="">Select your name…</option>
                {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.specialization}</option>)}
              </select>
            </Field>
            <Field label="Patient ID (PID)" hint="Ask the patient for their PID, e.g. CS81234">
              <Inp placeholder="CS81234" value={pid} onChange={e => { setPid(e.target.value.toUpperCase()); setError('') }} />
            </Field>
            <button className="btn" onClick={requestOTP} disabled={loading} style={{ padding:'14px', justifyContent:'center', fontSize:'1rem', gap:8, opacity: loading ? .7 : 1 }}>
              {loading ? <><Spinner /> Sending OTP…</> : 'Send OTP to Patient →'}
            </button>
          </>)}

          {step === 2 && (<>
            <Alert type="info">
              OTP sent to {patientInfo?.masked_phone}. Ask <strong>{patientInfo?.patient_name}</strong> to share the code with you.
            </Alert>
            <Field label="Enter OTP from patient">
              <Inp placeholder="6-digit code" value={otp} onChange={e => { setOtp(e.target.value); setError('') }} maxLength={6} style={{ fontSize:'1.3rem', textAlign:'center', letterSpacing:'.2em' }} />
            </Field>
            <button className="btn" onClick={verifyOTP} disabled={loading} style={{ padding:'14px', justifyContent:'center', fontSize:'1rem', gap:8, opacity: loading ? .7 : 1 }}>
              {loading ? <><Spinner /> Verifying…</> : 'Verify & Access Patient →'}
            </button>
            <button onClick={() => { setStep(1); setOtp(''); setError('') }} style={{ background:'none', border:'none', color:'var(--c-muted)', fontSize:'.82rem', cursor:'pointer', textAlign:'center' }}>← Back</button>
          </>)}

          <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--c-muted)', fontSize:'.8rem', cursor:'pointer', textAlign:'center', marginTop:4 }}>← Patient login</button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   DOCTOR DASHBOARD
---------------------------------------------------------------- */
function DoctorDashboard({ session, onLogout }) {
  const [activeTab,   setActiveTab]   = useState('overview')
  const [appointments, setAppointments] = useState([])
  const [patientData, setPatientData] = useState(null)
  const [diagnosis,   setDiagnosis]   = useState('')
  const [prescription, setPrescription] = useState('')
  const [followUp,    setFollowUp]    = useState('')
  const [selAppt,     setSelAppt]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [result,      setResult]      = useState(null)
  const [pingMsg,     setPingMsg]     = useState('')
  const [pinging,     setPinging]     = useState(false)
  const [vitals,      setVitals]      = useState({ heart_rate:'', blood_pressure:'', spo2:'', temperature:'' })
  const [savingVitals, setSavingVitals] = useState(false)
  const [timeLeft,    setTimeLeft]    = useState(600) // 10 minutes in seconds

  // Countdown timer — auto logout when session expires
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); onLogout(); return 0; }
        return t - 1;
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const { doctor, patient, token } = session || {}

  const docFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        ...(!(opts.body instanceof FormData) && { 'Content-Type':'application/json' }),
        Authorization: `Bearer ${token}`,
        ...opts.headers,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Request failed')
    return data
  }

  useEffect(() => {
    fetchAppointments()
    fetchPatientData()
  }, [])

  const fetchAppointments = async () => {
    try { const d = await docFetch('/appointments/doctor'); setAppointments(d.data || []) } catch(e){}
  }
  const fetchPatientData = async () => {
    try {
      const d = await docFetch(`/diagnoses/doctor/patient/${patient?.pid}`)
      setPatientData(d.data)
    } catch(e) {
      console.error('fetchPatientData error:', e.message)
      setResult({ success:false, message:`Could not load patient data: ${e.message}` })
    }
  }

  const saveDiagnosis = async () => {
    if (!diagnosis.trim()) return
    setSaving(true); setResult(null)
    try {
      await docFetch('/diagnoses', { method:'POST', body: JSON.stringify({ pid: patient?.pid, appointment_id: selAppt?.id || null, diagnosis, prescription, follow_up_date: followUp || null }) })
      setResult({ success:true, message:'Diagnosis saved successfully.' })
      setDiagnosis(''); setPrescription(''); setFollowUp(''); setSelAppt(null)
      fetchPatientData()
    } catch(e) { setResult({ success:false, message:e.message }) }
    finally { setSaving(false) }
  }

  const applyTag = async (tag) => {
    try {
      await docFetch('/diagnoses/tags', { method:'POST', body: JSON.stringify({ pid: patient?.pid, tag }) })
      fetchPatientData()
    } catch(e) { alert(e.message) }
  }

  const removeTag = async (id) => {
    try { await docFetch(`/diagnoses/tags/${id}`, { method:'DELETE' }); fetchPatientData() } catch(e){}
  }

  const saveVitals = async () => {
    setSavingVitals(true); setResult(null)
    try {
      const payload = { pid: patient?.pid }
      if (vitals.heart_rate)     payload.heart_rate     = vitals.heart_rate
      if (vitals.blood_pressure) payload.blood_pressure = vitals.blood_pressure
      if (vitals.spo2)           payload.spo2           = vitals.spo2
      if (vitals.temperature)    payload.temperature    = vitals.temperature
      await docFetch('/diagnoses/vitals', { method:'PATCH', body: JSON.stringify(payload) })
      setResult({ success:true, message:'Vital signs updated successfully.' })
    } catch(e) { setResult({ success:false, message:e.message }) }
    finally { setSavingVitals(false) }
  }

  const pingPatient = async () => {
    setPinging(true)
    try {
      await docFetch('/diagnoses/ping', { method:'POST', body: JSON.stringify({ pid: patient?.pid, message: pingMsg || undefined }) })
      setResult({ success:true, message:'Patient has been notified to upload files.' })
      setPingMsg('')
    } catch(e) { setResult({ success:false, message:e.message }) }
    finally { setPinging(false) }
  }

  const updateApptStatus = async (id, status) => {
    try { await docFetch(`/appointments/${id}/status`, { method:'PATCH', body: JSON.stringify({ status }) }); fetchAppointments() } catch(e){ alert(e.message) }
  }

  const TAGS = [
    { value:'stable',         label:'Stable',          color:'#22c55e' },
    { value:'follow-up',      label:'Follow-up',        color:'#3b82f6' },
    { value:'monitoring',     label:'Monitoring',       color:'#f59e0b' },
    { value:'critical',       label:'Critical',         color:'#f97316' },
    { value:'terminally-ill', label:'Terminally Ill',   color:'#ef4444' },
    { value:'recovered',      label:'Recovered',        color:'#00b4a0' },
  ]

  const statusColors = { pending:'#f59e0b', confirmed:'#22c55e', completed:'#6366f1', cancelled:'#ef4444' }
  const TABS = [
    { id:'overview',     label:'Patient',      icon:'👤' },
    { id:'vitals',       label:'Vitals',       icon:'❤️' },
    { id:'appointments', label:'Appointments', icon:'📅' },
    { id:'files',        label:'Files',        icon:'📁' },
    { id:'diagnosis',    label:'Diagnosis',    icon:'🩺' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', paddingTop:108 }}>
      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'linear-gradient(135deg,#060d1f,#0a2428)' }}>
        {/* Top bar — logo + session info + end button */}
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={28} radius={8} />
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.88rem' }}>Doctor Portal</p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.68rem' }}>{doctor?.name} · {doctor?.specialization}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ background: timeLeft <= 60 ? 'rgba(239,68,68,0.2)' : 'rgba(0,180,160,0.2)', border:`1px solid ${timeLeft<=60?'rgba(239,68,68,0.5)':'rgba(0,180,160,0.4)'}`, borderRadius:10, padding:'4px 10px', textAlign:'right', transition:'all .5s' }}>
              <p style={{ color:'var(--c-cyan)', fontWeight:700, fontSize:'.72rem' }}>Accessing: {patient?.pid}</p>
              <p style={{ color: timeLeft <= 60 ? '#fca5a5' : 'rgba(255,255,255,0.5)', fontSize:'.66rem', fontWeight: timeLeft <= 60 ? 700 : 400 }}>
                {patient?.name} · {fmtTime(timeLeft)} left {timeLeft <= 60 ? '⚠️' : ''}
              </p>
            </div>
            <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:50, padding:'6px 14px', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:'.78rem', fontWeight:600 }}>End</button>
          </div>
        </div>
        {/* Tab bar — separate row below top bar */}
        <div className="desktop-tabs" style={{ borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:2, padding:'0 24px', overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', border:'none', borderBottom: activeTab === t.id ? '2px solid var(--c-teal)' : '2px solid transparent', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.8rem', transition:'all .2s', background:'transparent', color: activeTab === t.id ? 'var(--c-cyan)' : 'rgba(255,255,255,0.45)', whiteSpace:'nowrap' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav — scrollable for 5 tabs */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner" style={{ overflowX:'auto', justifyContent:'flex-start', gap:0 }}>
          {TABS.map(t => (
            <button key={t.id} className={`mobile-nav-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ minWidth:64, flexShrink:0 }}>
              <span>{t.icon}</span>
              <span style={{ color: activeTab === t.id ? 'var(--c-teal)' : 'var(--c-muted)' }}>{t.label}</span>
            </button>
          ))}
          <button className="mobile-nav-btn" onClick={onLogout}><span>🚪</span><span style={{ color:'var(--c-muted)' }}>End</span></button>
        </div>
      </nav>

      <div className="dashboard-content" style={{ maxWidth:1100, margin:'0 auto', padding:'24px 24px 80px', paddingTop:116 }}>
        {result && <div style={{ marginBottom:16 }}><Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert></div>}

        {/* -- OVERVIEW TAB -- */}
        {activeTab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>
            {/* Patient summary */}
            <div className="card" style={{ padding:28 }}>
              <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:20 }}>Patient Profile</h2>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, paddingBottom:16, borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'1.1rem' }}>
                  {(patient?.name || 'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.95rem' }}>{patient?.name}</p>
                  <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:2 }}>PID: {patient?.pid}</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[['DOB', fmtDate(patient?.dob)],['Gender',patient?.gender||'—'],['Blood Type',patient?.blood_type||'—'],['Weight',patient?.weight_kg?`${patient.weight_kg} kg`:'—'],['Height',patient?.height_cm?`${patient.height_cm} cm`:'—'],['BMI',patient?.bmi||'—']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'.78rem', color:'var(--c-muted)' }}>{k}</span>
                    <span style={{ fontSize:'.8rem', fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div className="card" style={{ padding:24 }}>
                <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1rem', marginBottom:16 }}>Patient Tags</h2>
                {/* Current tags */}
                {patientData?.tags?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                    {patientData.tags.map(t => {
                      const cfg = TAGS.find(tg => tg.value === t.tag) || {}
                      return (
                        <div key={t.id} style={{ display:'flex', alignItems:'center', gap:6, background:`${cfg.color}15`, border:`1px solid ${cfg.color}30`, borderRadius:50, padding:'5px 12px' }}>
                          <span style={{ fontSize:'.75rem', fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                          <button onClick={() => removeTag(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:cfg.color, fontSize:'.75rem', padding:0, lineHeight:1 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {TAGS.map(t => (
                    <button key={t.value} onClick={() => applyTag(t.value)} style={{ padding:'6px 14px', borderRadius:50, border:`1.5px solid ${t.color}40`, background:'transparent', color:t.color, fontWeight:600, fontSize:'.75rem', cursor:'pointer', transition:'all .2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${t.color}12`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ping patient */}
              <div className="card" style={{ padding:24 }}>
                <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1rem', marginBottom:14 }}>Request Files from Patient</h2>
                <textarea className="inp" rows={2} style={{ resize:'none', fontSize:'.85rem', marginBottom:12 }} placeholder="Custom message (optional)…" value={pingMsg} onChange={e => setPingMsg(e.target.value)} />
                <button className="btn" onClick={pingPatient} disabled={pinging} style={{ width:'100%', justifyContent:'center', padding:'11px', gap:8, opacity: pinging?.7:1 }}>
                  {pinging ? <><Spinner /> Sending…</> : '🔔 Ping Patient'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -- APPOINTMENTS TAB -- */}
        {activeTab === 'appointments' && (
          <div>
            <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.5rem', marginBottom:20 }}>Scheduled Appointments</h1>
            <div className="card" style={{ padding:24 }}>
              {appointments.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📅</div>
                  <p style={{ fontWeight:600 }}>No appointments scheduled</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {appointments.map(a => (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', background:'rgba(255,255,255,0.7)', borderRadius:16, border:'1px solid rgba(0,0,0,0.07)' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:'.9rem' }}>{a.pid} — {a.doctor_name}</p>
                        <p style={{ fontSize:'.78rem', color:'var(--c-muted)', marginTop:2 }}>{new Date(a.date).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})} · {a.time_slot}</p>
                        {a.reason && <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:2, fontStyle:'italic' }}>"{a.reason}"</p>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:'.72rem', fontWeight:700, color:statusColors[a.status], background:`${statusColors[a.status]}15`, borderRadius:50, padding:'3px 10px', textTransform:'uppercase' }}>{a.status}</span>
                        {a.status === 'pending' && <button onClick={() => updateApptStatus(a.id,'confirmed')} style={{ padding:'5px 12px', borderRadius:50, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#16a34a', fontSize:'.75rem', fontWeight:600, cursor:'pointer' }}>Confirm</button>}
                        {a.status === 'confirmed' && <button onClick={() => updateApptStatus(a.id,'completed')} style={{ padding:'5px 12px', borderRadius:50, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', color:'#6366f1', fontSize:'.75rem', fontWeight:600, cursor:'pointer' }}>Mark Done</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- FILES TAB -- */}
        {/* -- DIAGNOSIS TAB — Patient view -- */}
        {activeTab === 'diagnosis' && <PatientDiagnosisTab patient={patient} />}

        {activeTab === 'files' && (
          <div>
            <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.5rem', marginBottom:20 }}>Patient Files</h1>
            <div className="card" style={{ padding:24 }}>
              {!patientData?.files?.length ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
                  <p style={{ fontWeight:600 }}>No files uploaded yet</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {patientData.files.map(f => {
                    const ft = FILE_TYPES.find(t => t.value === f.file_type) || FILE_TYPES[3]
                    return (
                      <div key={f.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.7)', borderRadius:16, border:'1px solid rgba(0,0,0,0.07)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:40, height:40, borderRadius:12, background:`${ft.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>{ft.icon}</div>
                          <p style={{ fontWeight:600, fontSize:'.87rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>{f.file_name}</p>
                          {f.file_url && (
                            <a href={f.file_url} target="_blank" rel="noreferrer" style={{ width:34, height:34, borderRadius:10, background:'rgba(0,180,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:'.85rem', flexShrink:0 }}>👁️</a>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, marginTop:8, paddingLeft:52 }}>
                          <span style={{ fontSize:'.7rem', fontWeight:600, color:ft.color, background:`${ft.color}12`, borderRadius:50, padding:'2px 8px' }}>{ft.label}</span>
                          <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>{fmtBytes(f.file_size)}</span>
                          <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>·</span>
                          <span style={{ fontSize:'.71rem', color:'var(--c-muted)' }}>{fmtDate(f.upload_date)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- VITALS TAB -- */}
        {activeTab === 'vitals' && (
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <div className="card" style={{ padding:28 }}>
              <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:6 }}>Update Vital Signs</h2>
              <p style={{ fontSize:'.8rem', color:'var(--c-muted)', marginBottom:24 }}>Enter the patient's current readings. Leave blank to keep existing values.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {[
                  { key:'heart_rate',     label:'Heart Rate',     placeholder:'e.g. 72',     unit:'bpm',  icon:'❤️', color:'#f43f5e' },
                  { key:'blood_pressure', label:'Blood Pressure', placeholder:'e.g. 118/76', unit:'mmHg', icon:'🫀', color:'#6366f1' },
                  { key:'spo2',           label:'SpO2',           placeholder:'e.g. 98',     unit:'%',    icon:'🫁', color:'#3b82f6' },
                  { key:'temperature',    label:'Temperature',    placeholder:'e.g. 98.6',   unit:'°F',   icon:'🌡️', color:'#f59e0b' },
                ].map(v => (
                  <div key={v.key} style={{ background:'rgba(0,0,0,0.02)', borderRadius:14, padding:'16px', border:'1px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:'1.2rem', color:v.color }}>{v.icon}</span>
                      <div>
                        <p style={{ fontWeight:700, fontSize:'.82rem', color:'var(--c-dark)' }}>{v.label}</p>
                        <p style={{ fontSize:'.7rem', color:'var(--c-muted)' }}>{v.unit}</p>
                      </div>
                    </div>
                    <input
                      className="inp"
                      placeholder={v.placeholder}
                      value={vitals[v.key]}
                      onChange={e => setVitals(prev => ({ ...prev, [v.key]: e.target.value }))}
                      style={{ background:'rgba(255,255,255,0.9)', borderColor: vitals[v.key] ? v.color : undefined }}
                    />
                  </div>
                ))}
              </div>
              <button
                className="btn"
                onClick={saveVitals}
                disabled={savingVitals || !Object.values(vitals).some(v => v.trim())}
                style={{ width:'100%', marginTop:22, padding:'13px', borderRadius:14, fontSize:'.9rem', opacity: savingVitals ? .7 : 1 }}
              >
                {savingVitals ? 'Saving…' : '💓 Save Vital Signs'}
              </button>
              <p style={{ fontSize:'.73rem', color:'var(--c-muted)', marginTop:12, textAlign:'center' }}>
                Saved vitals will appear immediately on the patient's dashboard
              </p>
            </div>
          </div>
        )}

        {/* -- DIAGNOSIS TAB -- */}
        {activeTab === 'diagnosis' && (
          <div className="doctor-diagnosis-layout">
            {/* Add diagnosis */}
            <div className="card doctor-diagnosis-editor" style={{ padding:28 }}>
              <div className="doctor-diagnosis-header">
                <div>
                  <p className="doctor-diagnosis-kicker">Clinical Entry</p>
                  <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.2rem', marginBottom:6 }}>Add Diagnosis</h2>
                  <p className="doctor-diagnosis-subtle">Document findings, treatment, and follow-up notes for this patient session.</p>
                </div>
                <div className="doctor-diagnosis-badge">Live Session</div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <Field label="Link to appointment (optional)">
                  <select className="inp" value={selAppt?.id || ''} onChange={e => setSelAppt(appointments.find(a => a.id === e.target.value) || null)}>
                    <option value="">No appointment linked</option>
                    {appointments.filter(a => a.status !== 'cancelled').map(a => (
                      <option key={a.id} value={a.id}>{new Date(a.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} · {a.time_slot} · {a.status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Diagnosis *">
                  <textarea className="inp doctor-diagnosis-textarea" rows={5} style={{ resize:'none' }} placeholder="Clinical findings, symptoms, observations, and assessment…" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </Field>
                <Field label="Prescription / Treatment">
                  <textarea className="inp doctor-diagnosis-textarea" rows={4} style={{ resize:'none' }} placeholder="Medications, dosage, instructions, or recommended treatment…" value={prescription} onChange={e => setPrescription(e.target.value)} />
                </Field>
                <div className="doctor-diagnosis-actions">
                  <Field label="Follow-up date">
                    <Inp type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
                  </Field>
                  <div className="doctor-diagnosis-submit">
                    <p className="doctor-diagnosis-subtle" style={{ marginBottom:10 }}>This will be added to the patient&apos;s live clinical record.</p>
                    <button className="btn" onClick={saveDiagnosis} disabled={saving || !diagnosis.trim()} style={{ justifyContent:'center', padding:'13px', gap:8, opacity: (!diagnosis.trim()||saving) ? .5 : 1, width:'100%' }}>
                  {saving ? <><Spinner /> Saving…</> : 'Save Diagnosis'}
                </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous diagnoses */}
            <div className="card doctor-diagnosis-history" style={{ padding:28 }}>
              <div className="doctor-diagnosis-header">
                <div>
                  <p className="doctor-diagnosis-kicker">Patient Timeline</p>
                  <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.2rem', marginBottom:6 }}>Previous Diagnoses</h2>
                  <p className="doctor-diagnosis-subtle">Review the patient&apos;s existing diagnosis history before adding new notes.</p>
                </div>
                <div className="doctor-diagnosis-badge">{patientData?.diagnoses?.length || 0} Entries</div>
              </div>

              {!patientData?.diagnoses?.length ? (
                <div className="doctor-diagnosis-empty" style={{ textAlign:'center', padding:'30px 0', color:'var(--c-muted)' }}>
                  <p style={{ fontSize:'2rem', marginBottom:8 }}>📋</p>
                  <p style={{ fontWeight:600 }}>No diagnoses yet</p>
                </div>
              ) : (
                <div className="doctor-diagnosis-history-list">
                  {patientData.diagnoses.map((d, index) => (
                    <div key={d.id} className="doctor-diagnosis-history-card">
                      <div className="doctor-diagnosis-history-top">
                        <div>
                          <span style={{ fontWeight:700, fontSize:'.82rem', color:'var(--c-teal)' }}>{d.doctor_name}</span>
                          <p className="doctor-diagnosis-subtle" style={{ marginTop:4 }}>Recorded on {fmtDate(d.created_at)}</p>
                        </div>
                        <span className="doctor-diagnosis-chip">#{patientData.diagnoses.length - index}</span>
                      </div>

                      <div className="doctor-diagnosis-block">
                        <p className="doctor-diagnosis-block-label">Diagnosis</p>
                        <p style={{ fontSize:'.86rem', lineHeight:1.7, margin:0 }}>{d.diagnosis}</p>
                      </div>

                      {d.prescription && (
                        <div className="doctor-diagnosis-block doctor-diagnosis-block-accent">
                          <p className="doctor-diagnosis-block-label">Prescription / Treatment</p>
                          <p style={{ fontSize:'.82rem', lineHeight:1.65, margin:0 }}>{d.prescription}</p>
                        </div>
                      )}

                      {d.follow_up_date && <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:10 }}>🔁 Follow-up: {fmtDate(d.follow_up_date)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserManual({ onBack, onTryDemo }) {
  const quickLinks = [
    ['start', 'Getting Started'],
    ['signin', 'Sign In'],
    ['signup', 'Sign Up'],
    ['doctor', 'Doctor Portal'],
    ['overview', 'Overview Dashboard'],
    ['records', 'Diagnosis & Records'],
    ['assistant', 'AI Assistant'],
    ['demo', 'Demo Mode'],
  ]

  const sections = [
    {
      id: 'signin',
      title: 'Sign in to CareSync',
      image: '/manual/image7.png',
      summary: 'Returning patients can access their dashboard from the sign-in modal.',
      steps: [
        'Open the homepage and select Get Started.',
        'Keep the Sign In tab selected.',
        'Enter your registered email address and password.',
        'Press Sign In to open the patient dashboard.',
      ],
      notes: [
        'Use a registered patient account when the backend is active.',
        'If the API is unavailable, use Try for free instead of sign-in.',
      ],
    },
    {
      id: 'signup',
      title: 'Create a patient account',
      image: '/manual/image6.png',
      summary: 'New users can create a profile with personal and health-related onboarding details.',
      steps: [
        'Switch from Sign In to Sign Up in the auth modal.',
        'Fill in your full name, email, phone number, date of birth, gender, and password.',
        'Continue through the remaining onboarding step to complete your health profile.',
        'Submit the form to create your CareSync account.',
      ],
      notes: [
        'Keeping profile details accurate helps doctors review your case faster.',
        'This flow is part of the live backend experience, not the frontend-only demo.',
      ],
    },
    {
      id: 'doctor',
      title: 'Doctor portal authentication',
      image: '/manual/image5.png',
      summary: 'Doctors enter through a dedicated portal and request OTP access for a specific patient.',
      steps: [
        'Open Doctor Portal from the landing page.',
        'Select the doctor name from the dropdown.',
        'Enter the patient PID exactly as shared by the patient.',
        'Choose Send OTP to Patient and continue only after patient verification succeeds.',
      ],
      notes: [
        'This workflow is for providers and depends on backend verification.',
        'Never access patient records without the patient-approved OTP session.',
      ],
    },
    {
      id: 'overview',
      title: 'Overview dashboard and health summary',
      image: '/manual/image4.png',
      summary: 'The overview page is the home base for patient health context, quick actions, and navigation.',
      steps: [
        'Review the welcome banner for patient ID, uploaded files, and upcoming appointments.',
        'Use the top navigation to move between Appointments, Diagnosis, Files, Upload, AI Chat, and User Manual.',
        'Check the Physical Profile cards for weight, height, BMI, and blood type.',
        'Review the Vital Signs panel for heart rate, blood pressure, SpO2, and temperature.',
      ],
      notes: [
        'The screenshot shown here is from Demo User mode, which runs entirely in the frontend.',
        'Quick Actions provide shortcuts to upload, files, and AI chat.',
      ],
    },
    {
      id: 'records',
      title: 'Diagnosis timeline and clinical status',
      image: '/manual/image2.png',
      summary: 'The Diagnosis area helps patients review prior doctor notes, prescriptions, and follow-up plans.',
      steps: [
        'Open the Diagnosis tab from the top navigation.',
        'Review the clinical status chips such as Stable and Follow Up.',
        'Read each consultation card for doctor name, date, diagnosis details, and treatment notes.',
        'Check the highlighted follow-up badge to see the next recommended review date.',
      ],
      notes: [
        'Diagnosis records are informational and should be interpreted with a licensed clinician.',
        'Follow-up entries help patients understand what action is expected next.',
      ],
    },
    {
      id: 'assistant',
      title: 'Use the AI clinical assistant',
      image: '/manual/image1.png',
      summary: 'CareSync AI helps users describe symptoms and navigate to the right care flow.',
      steps: [
        'Open AI Chat from the dashboard navigation or floating action button.',
        'Tap a suggested symptom chip or type your own concern.',
        'Review the AI response and follow any suggested next step.',
        'If a doctor recommendation appears, continue into the appointment booking flow.',
      ],
      notes: [
        'The AI assistant is for guidance only and does not replace professional medical advice.',
        'In demo mode the assistant replies locally with presentation-safe mock guidance.',
      ],
    },
  ]

  return (
    <div className="manual-page">
      <div className="manual-shell">
        <div className="manual-hero" id="start">
          <span className="demo-manual-eyebrow">Frontend companion</span>
          <h1>CareSync User Manual</h1>
          <p>This guide walks first-time users through the main CareSync flows using the actual interface screens from your product so they can understand where to click and what each area is for.</p>
          <div className="manual-hero-actions">
            <button className="btn" onClick={onTryDemo}>Launch Demo User</button>
            <button className="btn-o" onClick={onBack}>Back to site</button>
          </div>
        </div>

        <div className="manual-toc">
          {quickLinks.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="manual-toc-link">{label}</a>
          ))}
        </div>

        <div className="manual-grid">
          <div className="demo-manual-card">
            <span className="demo-manual-eyebrow">Start here</span>
            <h2>How to use this manual</h2>
            <div className="manual-step-list">
              {[
                'Use Get Started for real patient authentication when the backend is available.',
                'Use Try for free for a full frontend-only walkthrough with seeded patient data.',
                'Use the screenshot sections below to understand each major flow before navigating the live UI.',
              ].map((item, index) => (
                <div key={item} className="manual-step-item">
                  <div className="manual-step-index">{index + 1}</div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="demo-manual-card" id="demo">
            <span className="demo-manual-eyebrow">Demo mode</span>
            <h2>When the backend is offline</h2>
            <div className="manual-step-list">
              {[
                'Demo User is generated entirely in the frontend with mock vitals, appointments, files, and diagnosis history.',
                'Edits and simulated bookings stay local to the browser session and are never sent to your API.',
                'This mode is ideal for presentations, onboarding, and UI walkthroughs when Render has suspended the backend.',
              ].map((item, index) => (
                <div key={item} className="manual-step-item">
                  <div className="manual-step-index">{index + 1}</div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="manual-flow-stack">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="manual-flow-card">
              <div className="manual-flow-copy">
                <span className="demo-manual-eyebrow">Flow 0{index + 1}</span>
                <h2>{section.title}</h2>
                <p className="manual-flow-summary">{section.summary}</p>
                <div className="manual-step-list">
                  {section.steps.map((step, stepIndex) => (
                    <div key={step} className="manual-step-item">
                      <div className="manual-step-index">{stepIndex + 1}</div>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
                <div className="manual-note-list">
                  {section.notes.map(note => (
                    <p key={note} className="manual-note">{note}</p>
                  ))}
                </div>
              </div>
              <div className="manual-flow-media">
                <img src={section.image} alt={section.title} className="manual-flow-image" />
              </div>
            </section>
          ))}
        </div>

        <div className="demo-manual-card">
          <span className="demo-manual-eyebrow">Additional flows</span>
          <h2>Files, uploads, and appointments</h2>
          <div className="manual-step-list">
            {[
              'Files lets patients browse uploaded prescriptions, reports, and scans in one place.',
              'Upload provides the document submission entry point for prescriptions and medical reports.',
              'Appointments shows upcoming consultations, statuses, and doctor recommendations coming from AI or provider workflows.',
              'For presentations, the demo mode keeps these experiences visible even if live backend actions are unavailable.',
            ].map((item, index) => (
              <div key={item} className="manual-step-item">
                <div className="manual-step-index">{index + 1}</div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   ROOT — Session persistence + routing
---------------------------------------------------------------- */
export default function App() {
  const [view,        setView]       = useState('landing')  // 'landing' | 'dashboard' | 'doctor' | 'manual'
  const [patient,     setPatient]    = useState(null)
  const [doctorSession, setDoctorSession] = useState(null)  // { token, doctor, patient }
  const [authOpen,    setAuthOpen]   = useState(false)
  const [booting,     setBooting]    = useState(true)
  const [sessionMode, setSessionMode] = useState('live')
  const [demoData,    setDemoData]    = useState(createDemoBundle)
  const [manualReturnView, setManualReturnView] = useState('landing')

  useEffect(() => {
    const token  = getToken()
    const cached = storage.get(PATIENT_KEY)
    if (token && cached) {
      setPatient(cached)
      setView('dashboard')
      authFetch('/auth/me')
        .then(d => { setPatient(d.data); storage.set(PATIENT_KEY, d.data) })
        .catch(() => { clearAuth(); setView('landing') })
    }
    setBooting(false)
  }, [])

  // Refresh patient profile + vitals every 30 seconds
  useEffect(() => {
    if (sessionMode === 'demo') return
    const refreshPatient = () => {
      if (getToken()) {
        authFetch('/auth/me').then(d => { setPatient(d.data); storage.set(PATIENT_KEY, d.data) }).catch(()=>{})
      }
    }
    // Also refresh on tab focus
    window.addEventListener('focus', refreshPatient)
    // Poll every 30 seconds so vitals update without needing to switch tabs
    const interval = setInterval(refreshPatient, 30000)
    return () => { window.removeEventListener('focus', refreshPatient); clearInterval(interval) }
  }, [sessionMode])

  const openManual = (returnView = view) => {
    setManualReturnView(returnView)
    setView('manual')
  }
  const handleAuthSuccess = (p) => { setSessionMode('live'); setPatient(p); setAuthOpen(false); setView('dashboard') }
  const handleTryDemo = () => {
    clearAuth()
    const demo = createDemoBundle()
    setDemoData(demo)
    setSessionMode('demo')
    setPatient(demo.patient)
    setAuthOpen(false)
    setView('dashboard')
  }
  const handleLogout      = () => {
    clearAuth()
    setSessionMode('live')
    setPatient(null)
    setDemoData(createDemoBundle())
    setView('landing')
  }
  const handleDoctorLogin = (session) => { setDoctorSession(session); setView('doctor') }
  const handleDoctorLogout = () => { setDoctorSession(null); setView('landing') }

  if (booting) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-bg)' }}>
      <Spinner size={36} color="var(--c-teal)" />
    </div>
  )

  return (
    <>
      {view === 'dashboard' && (
        <Dashboard
          patient={patient}
          onLogout={handleLogout}
          demoMode={sessionMode === 'demo'}
          onPatientChange={setPatient}
          demoData={demoData}
          onDemoDataChange={(updater) => setDemoData(prev => typeof updater === 'function' ? updater(prev) : updater)}
          onOpenManual={() => openManual('dashboard')}
        />
      )}
      {view === 'doctor'    && <DoctorDashboard session={doctorSession} onLogout={handleDoctorLogout} />}
      {view === 'landing'   && (
        <Landing
          onOpenAuth={() => setAuthOpen(true)}
          onDoctorPortal={() => setView('doctor-login')}
          onTryDemo={handleTryDemo}
          onOpenManual={() => openManual('landing')}
        />
      )}
      {view === 'doctor-login' && <DoctorLogin onSuccess={handleDoctorLogin} onBack={() => setView('landing')} />}
      {view === 'manual' && <UserManual onBack={() => setView(manualReturnView)} onTryDemo={handleTryDemo} />}
      {authOpen && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setAuthOpen(false)} />}
    </>
  )
}

