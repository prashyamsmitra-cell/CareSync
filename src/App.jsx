import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

/* ════════════════════════════════════════════════════════════════
   CONFIG & HELPERS
════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */
const FEATURES = [
  { num:'01', title:'AI Assistance',    accent:'#00b4a0', bg:'rgba(0,180,160,0.07)',  desc:'Clinical intelligence that monitors patient data and delivers evidence-based guidance in real time.' },
  { num:'02', title:'Patient Records',  accent:'#3b82f6', bg:'rgba(59,130,246,0.07)', desc:'Unified health records across all care touchpoints — HIPAA-compliant, end-to-end encrypted.' },
  { num:'03', title:'Smart Monitoring', accent:'#f43f5e', bg:'rgba(244,63,94,0.07)',  desc:'Continuous vitals tracking with intelligent alerting and 360° health profile.' },
]

const FILE_TYPES = [
  { value: 'prescription', label: 'Prescription', icon: '💊', color: '#00b4a0' },
  { value: 'report',       label: 'Lab Report',   icon: '🧪', color: '#3b82f6' },
  { value: 'scan',         label: 'Scan / X-Ray', icon: '🩻', color: '#8b5cf6' },
  { value: 'other',        label: 'Other',        icon: '📄', color: '#94a3b8' },
]

/* ════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════════════════════════════ */
function Logo({ size = 34, radius = 10 }) {
  return <img src="/logo.jpeg" alt="CareSync" style={{ width:size, height:size, borderRadius:radius, objectFit:'contain', display:'block', flexShrink:0 }} />
}

function Field({ label, error, hint, children }) {
  return (
    <div>
      <label style={{ display:'block', fontWeight:600, fontSize:'.82rem', marginBottom:6, letterSpacing:'.02em' }}>{label}</label>
      {children}
      {hint  && <p style={{ fontSize:'.74rem', color:'var(--c-muted)', marginTop:4 }}>{hint}</p>}
      {error && <p style={{ fontSize:'.74rem', color:'#f87171',       marginTop:4 }}>{error}</p>}
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
        {show ? '🙈' : '👁'}
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

function AppointmentCountBadge({ pid, onBook }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    authFetch('/appointments').then(d => {
      const active = (d.data || []).filter(a => a.status === 'pending' || a.status === 'confirmed')
      setCount(active.length)
    }).catch(()=>{})
  }, [])
  return (
    <div className="welcome-stat" onClick={onBook} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer' }}>
      <p style={{ color:'#fff', fontWeight:700, fontSize:'.9rem' }}>{count} Appointment{count !== 1 ? 's' : ''}</p>
      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'.72rem', marginTop:1 }}>{count === 0 ? 'Book one →' : 'Upcoming'}</p>
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

/* ════════════════════════════════════════════════════════════════
   AUTH MODAL — Login / Sign Up (2-step)
════════════════════════════════════════════════════════════════ */
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

  /* ── Login ── */
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

  /* ── Signup step 1 validation ── */
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

  /* ── Signup submit ── */
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

  /* ── Live BMI preview ── */
  const liveBMI = signupForm.weight_kg && signupForm.height_cm
    ? (parseFloat(signupForm.weight_kg) / ((parseFloat(signupForm.height_cm) / 100) ** 2)).toFixed(1)
    : null

  const overlayStyle = { position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(6,13,31,0.75)', backdropFilter:'blur(12px)', padding:'16px' }
  const panelStyle   = { position:'relative', width:'100%', maxWidth:480, maxHeight:'94vh', overflowY:'auto', borderRadius:28, background:'#fff', boxShadow:'0 40px 100px rgba(0,0,0,0.3)', animation:'fadeUp .3s ease' }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#060d1f,#0a2428)', padding:'26px 30px 22px', borderRadius:'28px 28px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={30} radius={8} />
            <div>
              <p style={{ color:'#fff', fontWeight:800, fontFamily:'var(--font-h)', fontSize:'.95rem' }}>
                {mode === 'login' ? 'Welcome back' : step === 1 ? 'Create your account' : 'Health information'}
              </p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.72rem', marginTop:1 }}>
                {mode === 'login' ? 'Sign in to your CareSync account'
                  : step === 1 ? 'Step 1 of 2 — Personal details'
                  : 'Step 2 of 2 — Physical metrics'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Toggle */}
        <div style={{ padding:'18px 30px 0' }}>
          <div style={{ display:'flex', background:'rgba(0,0,0,0.05)', borderRadius:12, padding:4 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.84rem', transition:'all .2s', background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--c-dark)' : 'var(--c-muted)', boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'22px 30px 28px', display:'flex', flexDirection:'column', gap:15 }}>

          {apiErr && <Alert type="error">{apiErr}</Alert>}

          {/* ── LOGIN ── */}
          {mode === 'login' && (<>
            <Field label="Email address" error={loginErrs.email}>
              <Inp error={loginErrs.email} type="email" placeholder="you@hospital.com" value={loginForm.email} onChange={e => setL('email', e.target.value)} />
            </Field>
            <Field label="Password" error={loginErrs.password}>
              <PasswordInp error={loginErrs.password} value={loginForm.password} onChange={e => setL('password', e.target.value)} />
            </Field>
            <button className="btn" onClick={handleLogin} disabled={loading} style={{ padding:'14px', justifyContent:'center', fontSize:'1rem', borderRadius:14, gap:8, opacity: loading ? .7 : 1 }}>
              {loading ? <><Spinner /> Signing in…</> : 'Sign In →'}
            </button>
          </>)}

          {/* ── SIGNUP STEP 1 ── */}
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Date of birth" error={signupErrs.dob}>
                <Inp error={signupErrs.dob} type="date" value={signupForm.dob} onChange={e => setS('dob', e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className="inp" value={signupForm.gender} onChange={e => setS('gender', e.target.value)} style={{ background:'rgba(255,255,255,0.9)' }}>
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
            <button className="btn" onClick={() => { const e = validateStep1(); if (Object.keys(e).length) { setSignupErrs(e); return } setStep(2) }} style={{ padding:'14px', justifyContent:'center', fontSize:'1rem', borderRadius:14 }}>
              Continue →
            </button>
          </>)}

          {/* ── SIGNUP STEP 2 ── */}
          {mode === 'signup' && step === 2 && (<>
            <Alert type="info">Your metrics help us calculate BMI and personalise your dashboard. You can update these later.</Alert>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
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
                <div style={{ background:`${cat.color}12`, border:`1px solid ${cat.color}30`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:'2rem', color:cat.color, lineHeight:1 }}>{liveBMI}</div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:'.85rem', color:cat.color }}>BMI — {cat.label}</p>
                    <p style={{ fontSize:'.74rem', color:'var(--c-muted)', marginTop:2 }}>Based on entered values</p>
                  </div>
                </div>
              )
            })()}

            <Field label="Blood type">
              <select className="inp" value={signupForm.blood_type} onChange={e => setS('blood_type', e.target.value)} style={{ background:'rgba(255,255,255,0.9)' }}>
                {['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-ow" onClick={() => setStep(1)} style={{ padding:'13px 20px', fontSize:'.9rem' }}>← Back</button>
              <button className="btn" onClick={handleSignup} disabled={loading} style={{ flex:1, padding:'14px', justifyContent:'center', fontSize:'1rem', borderRadius:14, gap:8, opacity: loading ? .7 : 1 }}>
                {loading ? <><Spinner /> Creating account…</> : 'Create Account ✓'}
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

/* ════════════════════════════════════════════════════════════════
   DRAG & DROP FILE UPLOADER
════════════════════════════════════════════════════════════════ */
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
      <div className="file-type-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {FILE_TYPES.map(ft => (
          <button key={ft.value} onClick={() => setFileType(ft.value)} style={{ padding:'10px 8px', borderRadius:12, border:`1.5px solid ${fileType === ft.value ? ft.color : 'rgba(0,0,0,0.08)'}`, background: fileType === ft.value ? `${ft.color}12` : '#fff', cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:'1.2rem' }}>{ft.icon}</span>
            <span style={{ fontSize:'.72rem', fontWeight:600, color: fileType === ft.value ? ft.color : 'var(--c-muted)' }}>{ft.label}</span>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--c-teal)' : 'rgba(0,180,160,0.3)'}`,
          borderRadius: 18,
          padding: '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(0,180,160,0.05)' : 'rgba(0,180,160,0.02)',
          transition: 'all .2s',
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display:'none' }} onChange={e => addFiles(e.target.files)} />
        <div style={{ fontSize:'2rem', marginBottom:10 }}>📂</div>
        <p style={{ fontWeight:600, color:'var(--c-dark)', marginBottom:4 }}>
          {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p style={{ fontSize:'.78rem', color:'var(--c-muted)' }}>JPEG, PNG, WebP, PDF · Max 10 MB per file · Up to 5 files</p>
      </div>

      {/* Queued files */}
      {queued.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {queued.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(0,0,0,0.03)', borderRadius:12, border:'1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize:'1.1rem' }}>{f.type === 'application/pdf' ? '📄' : '🖼️'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:'.84rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</p>
                <p style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtBytes(f.size)}</p>
              </div>
              <button onClick={() => removeQueued(i)} style={{ width:26, height:26, borderRadius:'50%', background:'rgba(239,68,68,0.1)', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
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
        style={{ resize:'none', fontFamily:'var(--font-b)', fontSize:'.86rem' }}
      />

      {/* Progress */}
      {uploading && (
        <div style={{ background:'rgba(0,0,0,0.05)', borderRadius:50, height:6, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#00b4a0,#00d4c8)', borderRadius:50, transition:'width .3s' }} />
        </div>
      )}

      {result && <Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert>}

      <button className="btn" onClick={handleUpload} disabled={uploading || !queued.length} style={{ padding:'14px', justifyContent:'center', fontSize:'.95rem', borderRadius:14, gap:8, opacity: (uploading || !queued.length) ? .5 : 1 }}>
        {uploading ? <><Spinner /> Uploading… {progress}%</> : `Upload ${queued.length ? `${queued.length} File${queued.length > 1 ? 's' : ''}` : 'Files'}`}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   FILE LIBRARY — Shows uploaded files
════════════════════════════════════════════════════════════════ */
function FileLibrary({ files, loading, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    setDeleting(file.id)
    try {
      await authFetch(`/files/${file.id}`, { method:'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
    finally { setDeleting(null) }
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
      <Spinner size={28} color="var(--c-teal)" /><p style={{ marginTop:12, fontSize:'.85rem' }}>Loading files…</p>
    </div>
  )

  if (!files.length) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
      <p style={{ fontWeight:600 }}>No files yet</p>
      <p style={{ fontSize:'.82rem', marginTop:4 }}>Upload your first prescription or report above.</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {files.map(f => {
        const ft = FILE_TYPES.find(t => t.value === f.file_type) || FILE_TYPES[3]
        return (
          <div key={f.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'rgba(255,255,255,0.7)', borderRadius:16, border:'1px solid rgba(0,0,0,0.07)', transition:'all .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${ft.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
              {ft.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:600, fontSize:'.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</p>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                <span style={{ fontSize:'.7rem', fontWeight:600, color:ft.color, background:`${ft.color}12`, borderRadius:50, padding:'2px 8px' }}>{ft.label}</span>
                <span style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtBytes(f.file_size)}</span>
                <span style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtDate(f.upload_date)}</span>
              </div>
              {f.notes && <p style={{ fontSize:'.74rem', color:'var(--c-muted)', marginTop:3, fontStyle:'italic' }}>"{f.notes}"</p>}
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {f.file_url && (
                <a href={f.file_url} target="_blank" rel="noreferrer" style={{ width:34, height:34, borderRadius:10, background:'rgba(0,180,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:'.85rem', transition:'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,160,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,180,160,0.1)'}>
                  👁
                </a>
              )}
              <button onClick={() => handleDelete(f)} disabled={deleting === f.id} style={{ width:34, height:34, borderRadius:10, background:'rgba(239,68,68,0.08)', border:'none', cursor:'pointer', fontSize:'.85rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', opacity: deleting === f.id ? .5 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                {deleting === f.id ? <Spinner size={14} color="#ef4444" /> : '🗑'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   AI CHATBOT PANEL
════════════════════════════════════════════════════════════════ */
function ChatBot({ patient, onClose }) {
  const [msgs,   setMsgs]   = useState([{ role:'ai', text:"Hi! I'm your CareSync AI. Ask me anything about your health, medications, or appointments." }])
  const [inp,    setInp]    = useState('')
  const [typing, setTyping] = useState(false)
  const [sessId, setSessId] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, typing])

  const send = async () => {
    if (!inp.trim()) return
    const txt = inp.trim()
    setMsgs(m => [...m, { role:'user', text:txt }])
    setInp(''); setTyping(true)

    try {
      const data = await authFetch('/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message:txt, session_id: sessId }),
      })
      setSessId(data.data.session_id)
      setMsgs(m => [...m, { role:'ai', text:data.data.reply }])
    } catch (e) {
      setMsgs(m => [...m, { role:'ai', text:'Sorry, I had trouble responding. Please try again.' }])
    } finally { setTyping(false) }
  }

  return (
    <div className="chat-wrapper" style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:'24px' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(9,14,26,0.35)', backdropFilter:'blur(6px)' }} />
      <div className="chat-panel" style={{ position:'relative', width:'100%', maxWidth:420, height:640, maxHeight:'90vh', borderRadius:28, overflow:'hidden', display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.9)', backdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.65)', boxShadow:'0 32px 80px rgba(0,0,0,0.18)' }}>
        {/* header */}
        <div style={{ background:'linear-gradient(135deg,#060d1f,#0a2428)', padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:13, background:'rgba(0,180,160,0.2)', border:'1px solid rgba(0,180,160,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>✦</div>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.9rem' }}>CareSync AI</p>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e', animation:'pulse 2s infinite' }} />
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.7rem' }}>Online · Clinical Assistant</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        {/* messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:7 }}>
              {m.role === 'ai' && <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.6rem', fontWeight:800, flexShrink:0 }}>AI</div>}
              <div style={{ maxWidth:'78%', padding:'10px 14px', borderRadius:16, fontSize:'.86rem', lineHeight:1.6, ...(m.role === 'user' ? { background:'linear-gradient(135deg,#00b4a0,#00d4c8)', color:'#fff', borderBottomRightRadius:4 } : { background:'#fff', color:'var(--c-dark)', border:'1px solid rgba(0,0,0,0.07)', borderBottomLeftRadius:4, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }) }}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.6rem', fontWeight:800, flexShrink:0 }}>AI</div>
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:16, borderBottomLeftRadius:4, padding:'12px 16px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} className={`d${i+1}`} style={{ width:6, height:6, borderRadius:'50%', background:'var(--c-teal)' }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {/* input */}
        <div style={{ padding:'14px', borderTop:'1px solid rgba(0,0,0,0.06)', flexShrink:0, background:'rgba(255,255,255,0.6)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(255,255,255,0.9)', borderRadius:50, border:'1.5px solid rgba(0,0,0,0.08)', padding:'7px 7px 7px 18px' }}>
            <input style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:'var(--font-b)', fontSize:'.86rem', color:'var(--c-dark)' }} placeholder="Ask about your health…" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn" onClick={send} style={{ width:36, height:36, padding:0, borderRadius:50, justifyContent:'center', flexShrink:0 }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width:14, height:14 }}><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          <p style={{ textAlign:'center', fontSize:'.66rem', color:'rgba(0,0,0,0.25)', marginTop:7 }}>CareSync AI · For informational purposes only</p>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD — Per-patient, personalised
════════════════════════════════════════════════════════════════ */
function Dashboard({ patient, onLogout }) {
  const [activeTab, setActiveTab]   = useState('overview')
  const [chat,      setChat]        = useState(false)
  const [files,     setFiles]       = useState([])
  const [filesLoading, setFilesLoading] = useState(false)

  const initials = (patient?.name || 'JD').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const bmi      = patient?.bmi
  const bmiCat   = bmiCategory(bmi)

  const fetchFiles = async () => {
    setFilesLoading(true)
    try {
      const data = await authFetch('/files')
      setFiles(data.data || [])
    } catch (e) { console.error(e) }
    finally { setFilesLoading(false) }
  }

  useEffect(() => { if (activeTab === 'files') fetchFiles() }, [activeTab])

  const TABS = [
    { id:'overview',      label:'Overview',     icon:'🏠' },
    { id:'appointments',  label:'Appointments', icon:'📅' },
    { id:'files',         label:'Files',        icon:'📁' },
    { id:'upload',        label:'Upload',       icon:'⬆️'  },
    { id:'chat',          label:'AI Chat',      icon:'✦'   },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', paddingTop:76 }}>

      {/* Desktop Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(240,244,248,0.92)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(0,0,0,0.06)', height:64 }}>
        <div className="dash-nav-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'0 28px', height:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={32} radius={9} />
            <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem' }}>CareSync</span>
          </div>
          {/* Desktop tabs */}
          <div className="desktop-tabs" style={{ display:'flex', gap:4 }}>
            {TABS.filter(t => t.id !== 'chat').map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:50, border:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.83rem', transition:'all .2s', background: activeTab === t.id ? 'rgba(0,180,160,0.12)' : 'transparent', color: activeTab === t.id ? 'var(--c-teal)' : 'var(--c-muted)' }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn desktop-tabs" style={{ padding:'8px 18px', fontSize:'.82rem', display:'inline-flex' }} onClick={() => setChat(true)}>✦ AI Chat</button>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:50, border:'1px solid rgba(0,0,0,0.08)', background:'rgba(255,255,255,0.8)', cursor:'pointer' }} onClick={onLogout}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#00b4a0,#00d4c8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'.78rem' }}>{initials}</div>
              <span className="desktop-tabs" style={{ display:'inline', fontSize:'.8rem', fontWeight:600, color:'var(--c-muted)' }}>Sign out</span>
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
          <button className="mobile-nav-btn" onClick={onLogout}>
            <span>🚪</span>
            <span style={{ color:'var(--c-muted)' }}>Out</span>
          </button>
        </div>
      </nav>

      <div className="dashboard-content" style={{ maxWidth:1280, margin:'0 auto', padding:'24px 28px 60px' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Welcome banner */}
            <div className="welcome-banner" style={{ borderRadius:24, overflow:'hidden', marginBottom:26, position:'relative', background:'linear-gradient(135deg,#060d1f 0%,#0a2428 60%,#061a1a 100%)', padding:'36px 44px' }}>
              <div className="dotgrid" style={{ position:'absolute', inset:0, opacity:.35 }} />
              <div style={{ position:'absolute', top:-50, right:-50, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,180,160,0.22) 0%,transparent 70%)' }} />
              <div style={{ position:'relative', zIndex:1 }}>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'.8rem', fontWeight:500, marginBottom:4, letterSpacing:'.04em', textTransform:'uppercase' }}>Good afternoon 👋</p>
                <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'clamp(1.5rem,3vw,2rem)', color:'#fff', marginBottom:6 }}>
                  Welcome back, <span className="gt">{patient?.name?.split(' ')[0]}</span>
                </h1>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.85rem', marginBottom:22 }}>
                  Patient ID: <span style={{ color:'var(--c-cyan)', fontWeight:700, fontFamily:'var(--font-h)' }}>{patient?.pid}</span>
                  &nbsp;·&nbsp; Your health summary is looking great.
                </p>
                <div className="welcome-stats" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[
                    [`${files.filter(f=>f).length} Files`, 'Uploaded'],
                  ].map(([v, l]) => (
                    <div className="welcome-stat" key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ color:'#fff', fontWeight:700, fontSize:'.9rem' }}>{v}</p>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'.72rem', marginTop:1 }}>{l}</p>
                    </div>
                  ))}
                  <AppointmentCountBadge pid={patient?.pid} onBook={() => setActiveTab('appointments')} />
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:22 }}>
              {/* Left column */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

                {/* Physical stats */}
                <div className="card" style={{ padding:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                    <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem' }}>Physical Profile</h2>
                    <button onClick={() => setActiveTab('overview')} style={{ fontSize:'.78rem', color:'var(--c-teal)', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Edit →</button>
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
                </div>

                {/* Vital signs */}
                <div className="card" style={{ padding:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                    <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem' }}>Vital Signs</h2>
                    <span style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a', fontWeight:700, fontSize:'.7rem', padding:'4px 12px', borderRadius:50, border:'1px solid rgba(34,197,94,0.2)' }}>ALL NORMAL</span>
                  </div>
                  <div className="vitals-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                    {[
                      { label:'Heart Rate', value:'72',     unit:'bpm',  icon:'♥', color:'#f43f5e', trend:'+2%' },
                      { label:'Blood Pressure', value:'118/76', unit:'mmHg', icon:'◎', color:'#6366f1', trend:'Stable' },
                      { label:'SpO₂', value:'98', unit:'%', icon:'◉', color:'#3b82f6', trend:'+1%' },
                      { label:'Temperature', value:'98.6', unit:'°F', icon:'◈', color:'#f59e0b', trend:'Normal' },
                    ].map(m => (
                      <div key={m.label} style={{ background:'rgba(0,180,160,0.04)', borderRadius:16, padding:'18px 14px', textAlign:'center', border:'1px solid rgba(0,180,160,0.1)' }}>
                        <div style={{ fontSize:'1.3rem', color:m.color, marginBottom:5 }}>{m.icon}</div>
                        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.25rem', color:'var(--c-dark)' }}>{m.value}</div>
                        <div style={{ fontSize:'.7rem', color:'var(--c-muted)', marginTop:2 }}>{m.unit} · {m.label}</div>
                        <div style={{ fontSize:'.7rem', color:'#16a34a', fontWeight:700, marginTop:5 }}>{m.trend}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

                {/* Patient info card */}
                <div className="card" style={{ padding:24 }}>
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
                </div>

                {/* Quick actions */}
                <div className="card" style={{ padding:22 }}>
                  <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'.95rem', marginBottom:14 }}>Quick Actions</h2>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'Upload Prescription', icon:'💊', tab:'upload' },
                      { label:'View My Files',       icon:'📁', tab:'files'  },
                      { label:'Ask AI Assistant',    icon:'✦',  tab:null    },
                    ].map(a => (
                      <button key={a.label} onClick={() => a.tab ? setActiveTab(a.tab) : setChat(true)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, border:'1.5px solid rgba(0,0,0,0.07)', background:'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.82rem', transition:'all .2s', textAlign:'left' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'translateX(3px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)';  e.currentTarget.style.transform = 'translateX(0)' }}>
                        <span style={{ fontSize:'1rem' }}>{a.icon}</span>
                        <span style={{ color:'var(--c-dark)' }}>{a.label}</span>
                        <span style={{ marginLeft:'auto', color:'var(--c-muted)', fontSize:'.75rem' }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── FILES TAB ── */}
        {activeTab === 'files' && (
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
              <div>
                <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.6rem' }}>My Medical Files</h1>
                <p style={{ color:'var(--c-muted)', fontSize:'.85rem', marginTop:4 }}>{files.length} file{files.length !== 1 ? 's' : ''} stored securely</p>
              </div>
              <button className="btn" style={{ padding:'10px 20px', fontSize:'.84rem' }} onClick={() => setActiveTab('upload')}>+ Upload New</button>
            </div>
            <div className="card" style={{ padding:24 }}>
              <FileLibrary files={files} loading={filesLoading} onDelete={() => {}} onRefresh={fetchFiles} />
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS TAB ── */}
        {activeTab === 'appointments' && <AppointmentsTab patient={patient} />}

        {/* ── UPLOAD TAB ── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth:680, margin:'0 auto' }}>
            <div style={{ marginBottom:22 }}>
              <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.6rem' }}>Upload Documents</h1>
              <p style={{ color:'var(--c-muted)', fontSize:'.85rem', marginTop:4 }}>
                Upload prescriptions, lab reports, scans, or any health-related documents.
              </p>
            </div>
            <div className="card" style={{ padding:28 }}>
              <FileUploader pid={patient?.pid} onUploaded={() => { fetchFiles(); setActiveTab('files') }} />
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="btn fab-btn" onClick={() => setChat(true)} style={{ position:'fixed', bottom:32, right:32, width:56, height:56, borderRadius:18, fontSize:'1.3rem', padding:0, justifyContent:'center', boxShadow:'0 10px 30px rgba(0,180,160,0.4)', zIndex:50, animation:'glow 3s ease-in-out infinite' }} title="AI Assistant">✦</button>

      {chat && <ChatBot patient={patient} onClose={() => setChat(false)} />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════════════════════════════ */
function Landing({ onOpenAuth, onDoctorPortal }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background:'var(--c-bg)', minHeight:'100vh' }}>
      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, transition:'all .3s', background: scrolled ? 'rgba(240,244,248,0.88)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <Logo size={32} radius={9} />
            <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', color: scrolled ? 'var(--c-dark)' : '#fff', transition:'.3s' }}>CareSync</span>
          </div>
          {/* Desktop nav links */}
          <div className="desktop-tabs" style={{ display:'flex', alignItems:'center', gap:8 }}>
            {['Features','About','Pricing'].map(l => (
              <a key={l} href="#" style={{ color: scrolled ? 'var(--c-muted)' : 'rgba(255,255,255,0.7)', fontWeight:500, fontSize:'.85rem', textDecoration:'none', padding:'6px 12px', borderRadius:50, transition:'all .2s' }}
                onMouseEnter={e => e.target.style.color = scrolled ? 'var(--c-dark)' : '#fff'}
                onMouseLeave={e => e.target.style.color = scrolled ? 'var(--c-muted)' : 'rgba(255,255,255,0.7)'}>{l}</a>
            ))}
            <button className="btn" style={{ padding:'9px 20px', fontSize:'.82rem' }} onClick={onOpenAuth}>Get Started</button>
          </div>
          {/* Mobile — just Get Started button */}
          <div className="mobile-only" style={{ display:'none' }}>
            <button className="btn" style={{ padding:'8px 16px', fontSize:'.78rem' }} onClick={onOpenAuth}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', background:'linear-gradient(145deg,#060d1f 0%,#0a2428 40%,#061a1a 100%)' }}>
        <div className="dotgrid" style={{ position:'absolute', inset:0, opacity:.55 }} />
        <div style={{ position:'absolute', top:'15%', left:'8%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,180,160,0.2) 0%,transparent 70%)', animation:'float 7s ease-in-out infinite' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'5%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,200,0.14) 0%,transparent 70%)', animation:'floatR 9s ease-in-out infinite' }} />
        <div style={{ position:'absolute', top:'22%', right:'13%', width:160, height:160, border:'1px dashed rgba(0,180,160,0.22)', borderRadius:'50%', animation:'spin 20s linear infinite' }} />


        <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'0 24px', maxWidth:820, margin:'0 auto' }}>
          <div className="pill fu" style={{ marginBottom:26, color:'rgba(0,212,200,0.9)', borderColor:'rgba(0,180,160,0.3)', background:'rgba(0,180,160,0.08)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4c8', display:'inline-block' }} />
            AI-Powered Clinical Intelligence
          </div>
          <h1 className="fu2" style={{ fontFamily:'var(--font-h)', fontWeight:900, lineHeight:1.05, fontSize:'clamp(3rem,8vw,6rem)', color:'#fff', letterSpacing:'-0.03em', marginBottom:22 }}>
            Care<span className="gt">Sync</span>
          </h1>
          <p className="fu3" style={{ fontSize:'clamp(.95rem,2vw,1.18rem)', color:'rgba(255,255,255,0.55)', maxWidth:540, margin:'0 auto 40px', lineHeight:1.65 }}>
            Your personal health record — securely stored, intelligently managed, always accessible.
          </p>
          <div className="fu4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn" style={{ fontSize:'1rem', padding:'15px 34px' }} onClick={onOpenAuth}>
              Get Started
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width:15, height:15 }}><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
            </button>
            <button className="btn-ow" style={{ fontSize:'1rem', padding:'15px 34px' }} onClick={onDoctorPortal}>Doctor Portal</button>
          </div>
          <div className="fu4" style={{ display:'flex', justifyContent:'center', gap:44, marginTop:56, flexWrap:'wrap' }}>
            {[['50K+','Patients'],['99.9%','Uptime'],['4.9★','Rating']].map(([v, l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'1.7rem', color:'#fff', marginBottom:2 }}>{v}</div>
                <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,0.35)', letterSpacing:'.06em', textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:7, color:'rgba(255,255,255,0.28)', fontSize:'.7rem', letterSpacing:'.1em', textTransform:'uppercase' }}>
          Scroll<div style={{ width:1, height:40, background:'linear-gradient(to bottom,rgba(0,180,160,0.5),transparent)' }} />
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'100px 32px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:70 }}>
          <div className="pill fi" style={{ marginBottom:16, display:'inline-flex' }}>Platform</div>
          <h2 className="fu" style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-.025em', marginBottom:14 }}>Built for modern <span className="gt">healthcare</span></h2>
          <p className="fu2" style={{ color:'var(--c-muted)', fontSize:'1rem', maxWidth:480, margin:'0 auto', lineHeight:1.65 }}>A complete suite of clinical tools designed to elevate every patient interaction.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="card card-h fu" style={{ padding:32, animationDelay:`${i * .1}s`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, fontFamily:'var(--font-h)', fontWeight:900, fontSize:'4.5rem', color:f.accent, opacity:.05, lineHeight:1, userSelect:'none' }}>{f.num}</div>
              <div style={{ width:50, height:50, borderRadius:14, background:f.bg, display:'flex', alignItems:'center', justifyContent:'center', color:f.accent, marginBottom:20, fontSize:'1.4rem' }}>
                {f.num === '01' ? '✦' : f.num === '02' ? '📋' : '💓'}
              </div>
              <h3 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.1rem', marginBottom:10 }}>{f.title}</h3>
              <p style={{ color:'var(--c-muted)', lineHeight:1.65, fontSize:'.88rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'#090e1a', color:'rgba(255,255,255,0.3)', padding:'40px 32px', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:14 }}>
          <Logo size={28} radius={8} />
          <span style={{ color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-h)', fontWeight:700 }}>CareSync</span>
        </div>
        <p style={{ fontSize:'.78rem' }}>© 2026 CareSync Health Technologies · HIPAA Compliant · SOC 2 Type II</p>
      </footer>
    </div>
  )
}


/* ════════════════════════════════════════════════════════════════
   APPOINTMENTS TAB
════════════════════════════════════════════════════════════════ */
function AppointmentsTab({ patient }) {
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
    fetchDoctors()
    fetchAppointments()
    fetchPings()
  }, [])

  useEffect(() => {
    if (selDoctor && selDate) fetchSlots()
  }, [selDoctor, selDate])

  const fetchDoctors = async () => {
    try { const d = await authFetch('/doctors'); setDoctors(d.data || []) } catch(e){}
  }
  const fetchAppointments = async () => {
    try { const d = await authFetch('/appointments'); setAppointments(d.data || []) } catch(e){}
  }
  const fetchPings = async () => {
    try { const d = await authFetch('/diagnoses/pings/mine'); setPings(d.data || []) } catch(e){}
  }
  const fetchSlots = async () => {
    setSlotsLoading(true); setSelSlot('')
    try {
      const d = await authFetch(`/doctors/${selDoctor}/available-slots?date=${selDate}`)
      setAvailSlots(d.available || [])
    } catch(e){ setAvailSlots([]) }
    finally { setSlotsLoading(false) }
  }
  const dismissPing = async (id) => {
    try { await authFetch(`/diagnoses/pings/${id}/read`, { method:'PATCH' }); fetchPings() } catch(e){}
  }
  const bookAppointment = async () => {
    if (!selDoctor || !selDate || !selSlot) return
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
          {showBook ? '× Close' : '+ Book Appointment'}
        </button>
      </div>

      {result && <div style={{ marginBottom:16 }}><Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert></div>}

      {/* Booking form */}
      {showBook && (
        <div className="card" style={{ padding:28, marginBottom:24 }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:20 }}>Book New Appointment</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <Field label="Select Doctor">
              <select className="inp" value={selDoctor || ''} onChange={e => setSelDoctor(e.target.value)} style={{ background:'rgba(255,255,255,0.9)' }}>
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
                      <button key={s} onClick={() => setSelSlot(s)} style={{ padding:'8px 16px', borderRadius:50, border:`1.5px solid ${selSlot === s ? 'var(--c-teal)' : 'rgba(0,0,0,0.1)'}`, background: selSlot === s ? 'rgba(0,180,160,0.1)' : '#fff', color: selSlot === s ? 'var(--c-teal)' : 'var(--c-dark)', fontWeight:600, fontSize:'.82rem', cursor:'pointer', transition:'all .2s' }}>{s}</button>
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
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📅</div>
            <p style={{ fontWeight:600 }}>No appointments yet</p>
            <p style={{ fontSize:'.82rem', marginTop:4 }}>Book your first appointment above.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {appointments.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', background:'rgba(255,255,255,0.7)', borderRadius:16, border:'1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ width:46, height:46, borderRadius:14, background:'rgba(0,180,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>🩺</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:'.9rem' }}>{a.doctor_name}</p>
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

/* ════════════════════════════════════════════════════════════════
   DOCTOR LOGIN — OTP flow
════════════════════════════════════════════════════════════════ */
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
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <Logo size={30} radius={8} />
            <span style={{ color:'#fff', fontWeight:800, fontFamily:'var(--font-h)', fontSize:'1rem' }}>CareSync</span>
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

/* ════════════════════════════════════════════════════════════════
   DOCTOR DASHBOARD
════════════════════════════════════════════════════════════════ */
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
    { id:'appointments', label:'Appointments', icon:'📅' },
    { id:'files',        label:'Files',        icon:'📁' },
    { id:'diagnosis',    label:'Diagnosis',    icon:'🩺' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', paddingTop:70 }}>
      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'linear-gradient(135deg,#060d1f,#0a2428)', height:62 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Logo size={30} radius={8} />
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontFamily:'var(--font-h)', fontSize:'.9rem' }}>Doctor Portal</p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'.7rem' }}>{doctor?.name} · {doctor?.specialization}</p>
            </div>
          </div>
          <div className="desktop-tabs" style={{ display:'flex', gap:4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:50, border:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:600, fontSize:'.8rem', transition:'all .2s', background: activeTab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'rgba(0,180,160,0.2)', border:'1px solid rgba(0,180,160,0.4)', borderRadius:10, padding:'5px 12px', textAlign:'right' }}>
              <p style={{ color:'var(--c-cyan)', fontWeight:700, fontSize:'.75rem' }}>Accessing: {patient?.pid}</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'.68rem' }}>{patient?.name} · 2hr session</p>
            </div>
            <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:50, padding:'7px 16px', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:'.8rem', fontWeight:600 }}>End Session</button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {TABS.map(t => (
            <button key={t.id} className={`mobile-nav-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <span>{t.icon}</span>
              <span style={{ color: activeTab === t.id ? 'var(--c-teal)' : 'var(--c-muted)' }}>{t.label}</span>
            </button>
          ))}
          <button className="mobile-nav-btn" onClick={onLogout}><span>🚪</span><span style={{ color:'var(--c-muted)' }}>End</span></button>
        </div>
      </nav>

      <div className="dashboard-content" style={{ maxWidth:1100, margin:'0 auto', padding:'24px 24px 80px' }}>
        {result && <div style={{ marginBottom:16 }}><Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert></div>}

        {/* ── OVERVIEW TAB ── */}
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

        {/* ── APPOINTMENTS TAB ── */}
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

        {/* ── FILES TAB ── */}
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
                      <div key={f.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'rgba(255,255,255,0.7)', borderRadius:16, border:'1px solid rgba(0,0,0,0.07)' }}>
                        <div style={{ width:42, height:42, borderRadius:12, background:`${ft.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>{ft.icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:600, fontSize:'.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</p>
                          <div style={{ display:'flex', gap:8, marginTop:3 }}>
                            <span style={{ fontSize:'.7rem', fontWeight:600, color:ft.color, background:`${ft.color}12`, borderRadius:50, padding:'2px 8px' }}>{ft.label}</span>
                            <span style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtBytes(f.file_size)}</span>
                            <span style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtDate(f.upload_date)}</span>
                          </div>
                        </div>
                        {f.file_url && (
                          <a href={f.file_url} target="_blank" rel="noreferrer" style={{ width:34, height:34, borderRadius:10, background:'rgba(0,180,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:'.85rem' }}>👁</a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DIAGNOSIS TAB ── */}
        {activeTab === 'diagnosis' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>
            {/* Add diagnosis */}
            <div className="card" style={{ padding:28 }}>
              <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:20 }}>Add Diagnosis</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="Link to appointment (optional)">
                  <select className="inp" value={selAppt?.id || ''} onChange={e => setSelAppt(appointments.find(a => a.id === e.target.value) || null)} style={{ background:'rgba(255,255,255,0.9)' }}>
                    <option value="">No appointment linked</option>
                    {appointments.filter(a => a.status !== 'cancelled').map(a => (
                      <option key={a.id} value={a.id}>{new Date(a.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} · {a.time_slot} · {a.status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Diagnosis *">
                  <textarea className="inp" rows={4} style={{ resize:'none' }} placeholder="Clinical findings and diagnosis…" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </Field>
                <Field label="Prescription / Treatment">
                  <textarea className="inp" rows={3} style={{ resize:'none' }} placeholder="Medications, dosage, instructions…" value={prescription} onChange={e => setPrescription(e.target.value)} />
                </Field>
                <Field label="Follow-up date">
                  <Inp type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
                </Field>
                <button className="btn" onClick={saveDiagnosis} disabled={saving || !diagnosis.trim()} style={{ justifyContent:'center', padding:'13px', gap:8, opacity: (!diagnosis.trim()||saving) ? .5 : 1 }}>
                  {saving ? <><Spinner /> Saving…</> : 'Save Diagnosis'}
                </button>
              </div>
            </div>

            {/* Previous diagnoses */}
            <div className="card" style={{ padding:28 }}>
              <h2 style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.05rem', marginBottom:20 }}>Previous Diagnoses</h2>
              {!patientData?.diagnoses?.length ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'var(--c-muted)' }}>
                  <p style={{ fontSize:'2rem', marginBottom:8 }}>📋</p>
                  <p style={{ fontWeight:600 }}>No diagnoses yet</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12, maxHeight:500, overflowY:'auto' }}>
                  {patientData.diagnoses.map(d => (
                    <div key={d.id} style={{ padding:'14px 16px', background:'rgba(0,0,0,0.03)', borderRadius:14, border:'1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontWeight:700, fontSize:'.8rem', color:'var(--c-teal)' }}>{d.doctor_name}</span>
                        <span style={{ fontSize:'.72rem', color:'var(--c-muted)' }}>{fmtDate(d.created_at)}</span>
                      </div>
                      <p style={{ fontSize:'.85rem', lineHeight:1.6, marginBottom:d.prescription?8:0 }}>{d.diagnosis}</p>
                      {d.prescription && <p style={{ fontSize:'.78rem', color:'#6366f1', fontStyle:'italic' }}>Rx: {d.prescription}</p>}
                      {d.follow_up_date && <p style={{ fontSize:'.75rem', color:'var(--c-muted)', marginTop:4 }}>Follow-up: {fmtDate(d.follow_up_date)}</p>}
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

/* ════════════════════════════════════════════════════════════════
   ROOT — Session persistence + routing
════════════════════════════════════════════════════════════════ */
export default function App() {
  const [view,        setView]       = useState('landing')  // 'landing' | 'dashboard' | 'doctor'
  const [patient,     setPatient]    = useState(null)
  const [doctorSession, setDoctorSession] = useState(null)  // { token, doctor, patient }
  const [authOpen,    setAuthOpen]   = useState(false)
  const [booting,     setBooting]    = useState(true)

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

  const handleAuthSuccess = (p) => { setPatient(p); setAuthOpen(false); setView('dashboard') }
  const handleLogout      = () => { clearAuth(); setPatient(null); setView('landing') }
  const handleDoctorLogin = (session) => { setDoctorSession(session); setView('doctor') }
  const handleDoctorLogout = () => { setDoctorSession(null); setView('landing') }

  if (booting) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-bg)' }}>
      <Spinner size={36} color="var(--c-teal)" />
    </div>
  )

  return (
    <>
      {view === 'dashboard' && <Dashboard patient={patient} onLogout={handleLogout} />}
      {view === 'doctor'    && <DoctorDashboard session={doctorSession} onLogout={handleDoctorLogout} />}
      {view === 'landing'   && <Landing onOpenAuth={() => setAuthOpen(true)} onDoctorPortal={() => setView('doctor-login')} />}
      {view === 'doctor-login' && <DoctorLogin onSuccess={handleDoctorLogin} onBack={() => setView('landing')} />}
      {authOpen && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setAuthOpen(false)} />}
    </>
  )
}