import { useState, useEffect, useRef } from 'react'
import './App.css'

/* ─── constants ─────────────────────────────────────────────── */
const AI_REPLIES = [
  "Your vitals look great today. Blood pressure is within an optimal range and heart rate is steady.",
  "Based on your symptoms, I recommend consulting a specialist soon. I can help you book an appointment.",
  "I've reviewed your medication schedule. Your evening dose is at 8 PM — shall I set a reminder?",
  "You're due for your annual health checkup. I found 3 available slots this week. Want to review them?",
  "Your recent lab results are within normal limits. Your doctor will go over the details at your next visit.",
  "Sleep irregularity detected over the past week. Consider a consistent wind-down routine 30 min before bed.",
  "Your BMI and hydration metrics suggest you increase daily water intake by about 400ml.",
]

const FEATURES = [
  {
    num: '01',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{width:26,height:26}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
      </svg>
    ),
    title: 'AI Assistance',
    desc: 'Clinical intelligence that monitors patient data, flags anomalies, and delivers evidence-based guidance in real time.',
    accent: '#00b4a0',
    bg: 'rgba(0,180,160,0.07)',
  },
  {
    num: '02',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{width:26,height:26}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
      </svg>
    ),
    title: 'Patient Records',
    desc: 'Unified longitudinal health records across all care touchpoints — HIPAA-compliant, end-to-end encrypted, always in sync.',
    accent: '#3b82f6',
    bg: 'rgba(59,130,246,0.07)',
  },
  {
    num: '03',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{width:26,height:26}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
      </svg>
    ),
    title: 'Smart Monitoring',
    desc: 'Continuous vitals tracking with intelligent alerting. Connect wearables and IoT devices for a full 360° health profile.',
    accent: '#f43f5e',
    bg: 'rgba(244,63,94,0.07)',
  },
]

const APPOINTMENTS = [
  { name:'Dr. Amara Singh',  spec:'Cardiologist',   time:'Today · 3:30 PM',       init:'AS', color:'#00b4a0' },
  { name:'Dr. Liam Chen',    spec:'Neurologist',    time:'Wed Mar 5 · 10:00 AM',  init:'LC', color:'#6366f1' },
  { name:'Dr. Sofia Reyes',  spec:'Pulmonologist',  time:'Fri Mar 7 · 2:15 PM',   init:'SR', color:'#f43f5e' },
]

const METRICS = [
  { label:'Heart Rate',     value:'72',     unit:'bpm',  icon:'♥', trend:'+2%',   ok:true  },
  { label:'Blood Pressure', value:'118/76', unit:'mmHg', icon:'◎', trend:'Stable',ok:true  },
  { label:'SpO₂',           value:'98',     unit:'%',    icon:'◉', trend:'+1%',   ok:true  },
  { label:'Temperature',    value:'98.6',   unit:'°F',   icon:'◈', trend:'Normal',ok:true  },
]

/* ─── LANDING ────────────────────────────────────────────────── */
function Landing({ onEnter, formRef }) {
  const [nav, setNav] = useState(false)

  useEffect(() => {
    const fn = () => setNav(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{background:'var(--c-bg)', minHeight:'100vh'}}>

      {/* NAV */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        transition:'all .3s ease',
        background: nav ? 'rgba(240,244,248,0.85)' : 'transparent',
        backdropFilter: nav ? 'blur(22px)' : 'none',
        borderBottom: nav ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
      }}>
        <div style={{maxWidth:1200, margin:'0 auto', padding:'18px 32px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{
              width:34, height:34, borderRadius:10, cursor:'pointer',
              background:'linear-gradient(135deg,#00b4a0,#00d4c8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(0,180,160,0.35)',
            }}>
              <span style={{color:'#fff', fontWeight:800, fontFamily:'var(--font-h)', fontSize:'1rem'}}>C</span>
            </div>
            <span style={{fontFamily:'var(--font-h)', fontWeight:700, fontSize:'1.1rem', color: nav ? 'var(--c-dark)' : '#fff', transition:'.3s'}}>
              CareSync
            </span>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:10}}>
            {['Features','About','Pricing'].map(l => (
              <a key={l} href="#" style={{
                color: nav ? 'var(--c-muted)' : 'rgba(255,255,255,0.75)',
                fontWeight:500, fontSize:'.87rem', textDecoration:'none',
                padding:'6px 14px', borderRadius:50, transition:'all .2s',
              }}
              onMouseEnter={e => e.target.style.color = nav ? 'var(--c-dark)' : '#fff'}
              onMouseLeave={e => e.target.style.color = nav ? 'var(--c-muted)' : 'rgba(255,255,255,0.75)'}
              >{l}</a>
            ))}
            <button className="btn" style={{padding:'10px 22px', fontSize:'.82rem'}} onClick={onEnter}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
        background:'linear-gradient(145deg, #060d1f 0%, #0a2428 40%, #061a1a 100%)',
      }}>
        {/* dot grid */}
        <div className="dotgrid" style={{position:'absolute',inset:0,opacity:0.6}} />

        {/* blobs */}
        <div style={{position:'absolute', top:'15%', left:'8%', width:520, height:520, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,180,160,0.22) 0%, transparent 70%)',
          animation:'float 7s ease-in-out infinite', filter:'blur(2px)'}} />
        <div style={{position:'absolute', bottom:'10%', right:'5%', width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,212,200,0.16) 0%, transparent 70%)',
          animation:'floatR 9s ease-in-out infinite', filter:'blur(2px)'}} />
        <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,180,160,0.06) 0%, transparent 65%)'}} />

        {/* rotating ring */}
        <div style={{
          position:'absolute', top:'20%', right:'14%', width:180, height:180,
          border:'1px dashed rgba(0,180,160,0.25)', borderRadius:'50%',
          animation:'spin 20s linear infinite',
        }} />
        <div style={{
          position:'absolute', bottom:'22%', left:'12%', width:110, height:110,
          border:'1px dashed rgba(0,180,160,0.18)', borderRadius:'50%',
          animation:'spin 14s linear infinite reverse',
        }} />

        {/* floating cards */}
        <div className="glass-dark fu" style={{
          position:'absolute', top:'22%', right:'11%', padding:'14px 18px',
          borderRadius:16, minWidth:190, animation:'float 6s 1s ease-in-out infinite',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 10px #22c55e',flexShrink:0}} />
            <span style={{color:'rgba(255,255,255,0.5)', fontSize:'.7rem', fontWeight:600, letterSpacing:'.05em'}}>LIVE VITALS</span>
          </div>
          <div style={{color:'#fff', fontWeight:800, fontSize:'1.5rem', fontFamily:'var(--font-h)'}}>98 <span style={{fontSize:'.75rem',fontWeight:400,color:'rgba(255,255,255,0.5)'}}>SpO₂%</span></div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'.72rem',marginTop:3}}>Normal range · Updated now</div>
        </div>

        <div className="glass-dark fu2" style={{
          position:'absolute', bottom:'26%', left:'9%', padding:'14px 18px',
          borderRadius:16, minWidth:170, animation:'floatR 8s 0.5s ease-in-out infinite',
        }}>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:'.7rem',fontWeight:600,letterSpacing:'.05em',marginBottom:6}}>NEXT APPT.</div>
          <div style={{color:'#fff',fontWeight:700,fontSize:'.95rem'}}>Dr. Amara Singh</div>
          <div style={{color:'var(--c-cyan)',fontSize:'.75rem',marginTop:2}}>Today · 3:30 PM</div>
        </div>

        {/* main content */}
        <div style={{position:'relative',zIndex:2,textAlign:'center',padding:'0 24px',maxWidth:860,margin:'0 auto'}}>
          <div className="pill fu" style={{marginBottom:28,color:'rgba(0,212,200,0.9)',borderColor:'rgba(0,180,160,0.3)',background:'rgba(0,180,160,0.08)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00d4c8',display:'inline-block'}} />
            GPT-4 Powered Clinical Intelligence
          </div>

          <h1 className="fu2" style={{
            fontFamily:'var(--font-h)', fontWeight:900, lineHeight:1.05,
            fontSize:'clamp(3.2rem, 8vw, 6.5rem)', color:'#fff',
            letterSpacing:'-0.03em', marginBottom:24,
          }}>
            Care<span className="gt">Sync</span>
          </h1>

          <p className="fu3" style={{
            fontSize:'clamp(1rem,2vw,1.22rem)', color:'rgba(255,255,255,0.6)',
            maxWidth:580, margin:'0 auto 14px', lineHeight:1.65, fontWeight:300,
          }}>
            Smart Patient Management with AI Assistance
          </p>
          <p className="fu4" style={{
            fontSize:'.92rem', color:'rgba(255,255,255,0.38)',
            maxWidth:460, margin:'0 auto 44px', lineHeight:1.6,
          }}>
            Unify records, automate workflows, and deliver better outcomes with always-on clinical intelligence.
          </p>

          <div className="fu5" style={{display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap'}}>
            <button className="btn" style={{fontSize:'1rem', padding:'16px 36px'}} onClick={onEnter}>
              Get Started
              <svg viewBox="0 0 20 20" fill="currentColor" style={{width:16,height:16}}>
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd"/>
              </svg>
            </button>
            <button className="btn-ow" style={{fontSize:'1rem', padding:'16px 36px'}}
              onClick={() => formRef.current?.scrollIntoView({behavior:'smooth',block:'center'})}>
              Register Patient
            </button>
          </div>

          {/* stats row */}
          <div className="fu5" style={{display:'flex', justifyContent:'center', gap:48, marginTop:64, flexWrap:'wrap'}}>
            {[['50K+','Patients Managed'],['99.9%','Platform Uptime'],['4.9★','Avg. Rating']].map(([v,l])=>(
              <div key={l} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'1.8rem',color:'#fff',marginBottom:2}}>{v}</div>
                <div style={{fontSize:'.75rem',color:'rgba(255,255,255,0.38)',letterSpacing:'.05em',textTransform:'uppercase'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* scroll cue */}
        <div style={{position:'absolute',bottom:36,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:'rgba(255,255,255,0.3)',fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase'}}>
          Scroll
          <div style={{width:1,height:44,background:'linear-gradient(to bottom,rgba(0,180,160,0.6),transparent)'}} />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'120px 32px', maxWidth:1200, margin:'0 auto'}}>
        <div style={{textAlign:'center', marginBottom:80}}>
          <div className="pill fi" style={{marginBottom:18,display:'inline-flex'}}>Platform Capabilities</div>
          <h2 className="fu" style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'clamp(2rem,4vw,3rem)',letterSpacing:'-.025em',marginBottom:16}}>
            Built for modern <span className="gt">healthcare</span>
          </h2>
          <p className="fu2" style={{color:'var(--c-muted)',fontSize:'1.05rem',maxWidth:520,margin:'0 auto',lineHeight:1.65}}>
            A complete suite of clinical tools designed to elevate every patient interaction.
          </p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:28}}>
          {FEATURES.map((f,i) => (
            <div key={i} className="card card-h fu" style={{padding:36, animationDelay:`${i*0.1}s`, position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,right:0,fontFamily:'var(--font-h)',fontWeight:900,fontSize:'5rem',color:f.accent,opacity:.05,lineHeight:1,userSelect:'none'}}>
                {f.num}
              </div>
              <div style={{
                width:56,height:56,borderRadius:16,background:f.bg,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:f.accent, marginBottom:24,
              }}>
                {f.icon}
              </div>
              <h3 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.18rem',marginBottom:12}}>{f.title}</h3>
              <p style={{color:'var(--c-muted)',lineHeight:1.7,fontSize:'.9rem'}}>{f.desc}</p>
              <div style={{marginTop:24,display:'flex',alignItems:'center',gap:6,color:f.accent,fontWeight:700,fontSize:'.85rem',cursor:'pointer'}}>
                Explore feature
                <svg viewBox="0 0 16 16" fill="currentColor" style={{width:14,height:14}}>
                  <path fillRule="evenodd" d="M1.75 8a.75.75 0 01.75-.75h9.19L8.22 3.78a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.47-3.47H2.5A.75.75 0 011.75 8z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REGISTRATION FORM */}
      <section ref={formRef} style={{
        padding:'100px 32px',
        background:'linear-gradient(160deg,rgba(0,180,160,0.04) 0%,rgba(240,244,248,1) 60%)',
      }}>
        <div style={{maxWidth:660, margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <div className="pill fi" style={{marginBottom:18,display:'inline-flex'}}>Patient Onboarding</div>
            <h2 className="fu" style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'clamp(1.8rem,3.5vw,2.6rem)',letterSpacing:'-.025em',marginBottom:14}}>
              Register a new patient
            </h2>
            <p className="fu2" style={{color:'var(--c-muted)',lineHeight:1.65}}>
              Secure, encrypted intake — patient data is protected end-to-end.
            </p>
          </div>
          <RegForm onSuccess={onEnter} />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#090e1a',color:'rgba(255,255,255,0.35)',padding:'48px 32px',textAlign:'center'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:16}}>
          <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'#fff',fontWeight:800,fontSize:'.85rem'}}>C</span>
          </div>
          <span style={{color:'rgba(255,255,255,0.75)',fontFamily:'var(--font-h)',fontWeight:700}}>CareSync</span>
        </div>
        <p style={{fontSize:'.8rem'}}>© 2026 CareSync Health Technologies · HIPAA Compliant · SOC 2 Type II Certified</p>
      </footer>
    </div>
  )
}

/* ─── REG FORM ───────────────────────────────────────────────── */
function RegForm({ onSuccess }) {
  const [fd, setFd] = useState({name:'',age:'',gender:'',symptoms:'',contact:''})
  const [err, setErr] = useState({})
  const [ok, setOk] = useState(false)

  const validate = () => {
    const e = {}
    if (!fd.name.trim()) e.name = 'Full name required'
    if (!fd.age || isNaN(fd.age) || fd.age<1 || fd.age>130) e.age = 'Enter a valid age'
    if (!fd.gender) e.gender = 'Select a gender'
    if (!fd.symptoms.trim()) e.symptoms = 'Describe symptoms'
    if (!/^\+?[\d\s\-()]{7,15}$/.test(fd.contact)) e.contact = 'Enter a valid number'
    return e
  }

  const submit = (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErr(e2); return }
    setOk(true)
    setTimeout(onSuccess, 1600)
  }

  const set = (k,v) => { setFd({...fd,[k]:v}); setErr({...err,[k]:''}) }

  const ic = (k) => ['inp', err[k] ? 'inp-err' : ''].join(' ')

  if (ok) return (
    <div className="card si" style={{padding:60,textAlign:'center'}}>
      <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(34,197,94,0.12)',margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{width:36,height:36}}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h3 style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'1.6rem',marginBottom:8}}>Patient Registered!</h3>
      <p style={{color:'var(--c-muted)'}}>Taking you to the dashboard…</p>
    </div>
  )

  return (
    <div className="card fu" style={{padding:'44px 48px'}}>
      <form onSubmit={submit} noValidate>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          <div>
            <label style={{display:'block',fontWeight:600,fontSize:'.82rem',marginBottom:8,letterSpacing:'.02em'}}>Full Name</label>
            <input className={ic('name')} placeholder="e.g. Sarah Johnson" value={fd.name} onChange={e=>set('name',e.target.value)}/>
            {err.name && <p style={{color:'#f87171',fontSize:'.78rem',marginTop:5}}>{err.name}</p>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label style={{display:'block',fontWeight:600,fontSize:'.82rem',marginBottom:8}}>Age</label>
              <input type="number" className={ic('age')} placeholder="34" value={fd.age} onChange={e=>set('age',e.target.value)}/>
              {err.age && <p style={{color:'#f87171',fontSize:'.78rem',marginTop:5}}>{err.age}</p>}
            </div>
            <div>
              <label style={{display:'block',fontWeight:600,fontSize:'.82rem',marginBottom:8}}>Gender</label>
              <select className={ic('gender')} value={fd.gender} onChange={e=>set('gender',e.target.value)} style={{background:'rgba(255,255,255,0.85)'}}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
                <option>Non-binary</option><option>Prefer not to say</option>
              </select>
              {err.gender && <p style={{color:'#f87171',fontSize:'.78rem',marginTop:5}}>{err.gender}</p>}
            </div>
          </div>

          <div>
            <label style={{display:'block',fontWeight:600,fontSize:'.82rem',marginBottom:8}}>Symptoms</label>
            <textarea className={ic('symptoms')} rows={3} placeholder="e.g. persistent headache, fatigue, shortness of breath"
              value={fd.symptoms} onChange={e=>set('symptoms',e.target.value)}
              style={{resize:'none', fontFamily:'var(--font-b)'}}/>
            {err.symptoms && <p style={{color:'#f87171',fontSize:'.78rem',marginTop:5}}>{err.symptoms}</p>}
          </div>

          <div>
            <label style={{display:'block',fontWeight:600,fontSize:'.82rem',marginBottom:8}}>Contact Number</label>
            <input type="tel" className={ic('contact')} placeholder="+91 98765 43210" value={fd.contact} onChange={e=>set('contact',e.target.value)}/>
            {err.contact && <p style={{color:'#f87171',fontSize:'.78rem',marginTop:5}}>{err.contact}</p>}
          </div>

          <button type="submit" className="btn" style={{marginTop:8,fontSize:'1rem',padding:'16px',justifyContent:'center',borderRadius:14}}>
            Register Patient →
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── DASHBOARD ──────────────────────────────────────────────── */
function Dashboard({ onChat }) {
  return (
    <div style={{minHeight:'100vh',background:'var(--c-bg)', paddingTop:90}}>

      {/* Top bar */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:100,
        background:'rgba(240,244,248,0.88)',backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{maxWidth:1300,margin:'0 auto',padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,180,160,0.3)'}}>
              <span style={{color:'#fff',fontWeight:800,fontFamily:'var(--font-h)'}}>C</span>
            </div>
            <span style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.05rem'}}>CareSync</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="btn" style={{padding:'10px 22px',fontSize:'.84rem'}} onClick={onChat}>
              ✦ Open AI Assistant
            </button>
            <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'.85rem',boxShadow:'0 4px 12px rgba(0,180,160,0.3)'}}>
              JD
            </div>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1300,margin:'0 auto',padding:'0 32px 60px'}}>

        {/* Welcome banner */}
        <div className="fu" style={{
          borderRadius:28, overflow:'hidden', marginBottom:32, position:'relative',
          background:'linear-gradient(135deg,#060d1f 0%,#0a2428 60%,#061a1a 100%)',
          padding:'44px 48px',
        }}>
          <div className="dotgrid" style={{position:'absolute',inset:0,opacity:0.4}}/>
          <div style={{position:'absolute',top:-60,right:-60,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,180,160,0.25) 0%,transparent 70%)'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:'.82rem',fontWeight:500,marginBottom:6,letterSpacing:'.04em',textTransform:'uppercase'}}>
              Good afternoon 👋
            </p>
            <h1 style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'clamp(1.6rem,3vw,2.2rem)',color:'#fff',marginBottom:8}}>
              Welcome back, <span className="gt">John Doe</span>
            </h1>
            <p style={{color:'rgba(255,255,255,0.45)',fontSize:'.9rem',marginBottom:28}}>
              Your health summary is looking great today. No critical alerts.
            </p>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              {[['3 Appointments','Upcoming'],['2 Medications','Active'],['1 Lab Result','New']].map(([v,l])=>(
                <div key={l} style={{background:'rgba(255,255,255,0.08)',backdropFilter:'blur(10px)',borderRadius:14,padding:'12px 18px',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <p style={{color:'#fff',fontWeight:700,fontSize:'.95rem'}}>{v}</p>
                  <p style={{color:'rgba(255,255,255,0.4)',fontSize:'.75rem',marginTop:2}}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>

          {/* Metrics — span 2 */}
          <div className="card fu2" style={{padding:32,gridColumn:'span 2'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
              <h2 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.1rem'}}>Health Status</h2>
              <span style={{background:'rgba(34,197,94,0.1)',color:'#16a34a',fontWeight:700,fontSize:'.72rem',padding:'5px 12px',borderRadius:50,border:'1px solid rgba(34,197,94,0.2)',letterSpacing:'.04em'}}>
                ALL NORMAL
              </span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {METRICS.map(m=>(
                <div key={m.label} style={{
                  background:'rgba(0,180,160,0.04)',borderRadius:18,padding:'20px 16px',textAlign:'center',
                  border:'1px solid rgba(0,180,160,0.1)',cursor:'pointer',
                  transition:'all .25s ease',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,180,160,0.08)';e.currentTarget.style.transform='translateY(-3px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,180,160,0.04)';e.currentTarget.style.transform='translateY(0)'}}>
                  <div style={{fontSize:'1.4rem',marginBottom:6}}>{m.icon}</div>
                  <div style={{fontFamily:'var(--font-h)',fontWeight:800,fontSize:'1.4rem',color:'var(--c-dark)'}}>{m.value}</div>
                  <div style={{fontSize:'.72rem',color:'var(--c-muted)',marginTop:2}}>{m.unit}</div>
                  <div style={{fontSize:'.7rem',color:'var(--c-muted)',marginTop:2}}>{m.label}</div>
                  <div style={{fontSize:'.72rem',color:'#16a34a',fontWeight:700,marginTop:6}}>{m.trend}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Appointments */}
          <div className="card fu3" style={{padding:28}}>
            <h2 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.05rem',marginBottom:20}}>Upcoming Appointments</h2>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {APPOINTMENTS.map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:14,cursor:'pointer',transition:'background .2s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:40,height:40,borderRadius:12,background:`${a.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:a.color,fontWeight:800,fontSize:'.8rem',flexShrink:0}}>
                    {a.init}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:600,fontSize:'.87rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</p>
                    <p style={{fontSize:'.72rem',color:'var(--c-muted)'}}>{a.spec}</p>
                    <p style={{fontSize:'.72rem',color:'var(--c-teal)',fontWeight:600,marginTop:2}}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button style={{marginTop:16,width:'100%',padding:'10px',borderRadius:12,border:'1.5px solid rgba(0,180,160,0.2)',background:'transparent',color:'var(--c-teal)',fontWeight:700,fontSize:'.82rem',cursor:'pointer',fontFamily:'var(--font-b)',transition:'all .2s'}}
            onMouseEnter={e=>{e.target.style.background='rgba(0,180,160,0.06)'}}
            onMouseLeave={e=>{e.target.style.background='transparent'}}>
              View All →
            </button>
          </div>

          {/* Patient card */}
          <div className="card fu2" style={{padding:32,gridColumn:'span 2'}}>
            <h2 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.05rem',marginBottom:24}}>Patient Summary</h2>
            <div style={{display:'flex',alignItems:'flex-start',gap:20}}>
              <div style={{width:64,height:64,borderRadius:20,background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:'1.2rem',flexShrink:0,boxShadow:'0 8px 24px rgba(0,180,160,0.3)'}}>
                JD
              </div>
              <div style={{flex:1}}>
                <h3 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.15rem',marginBottom:4}}>John Doe</h3>
                <p style={{color:'var(--c-muted)',fontSize:'.85rem',marginBottom:12}}>Age 34 · Male · ID #CS-00421</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {['Hypertension','Type 2 Diabetes','Penicillin Allergy'].map(t=>(
                    <span key={t} style={{background:'rgba(0,0,0,0.05)',color:'var(--c-muted)',fontSize:'.75rem',fontWeight:500,padding:'4px 12px',borderRadius:50}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(0,0,0,0.06)',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
              {[['Blood Type','O+'],['Weight','78 kg'],['Height',"5'11\""]].map(([k,v])=>(
                <div key={k}>
                  <p style={{fontSize:'.72rem',color:'var(--c-muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{k}</p>
                  <p style={{fontWeight:700,fontSize:'1rem'}}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card fu3" style={{padding:28}}>
            <h2 style={{fontFamily:'var(--font-h)',fontWeight:700,fontSize:'1.05rem',marginBottom:20}}>Quick Actions</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {label:'Book Appointment',icon:'📅',color:'#6366f1'},
                {label:'Request Lab Test',icon:'🧪',color:'#f59e0b'},
                {label:'Message Doctor',icon:'💬',color:'#00b4a0'},
                {label:'Download Records',icon:'📁',color:'#f43f5e'},
              ].map(a=>(
                <button key={a.label} style={{
                  display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                  borderRadius:12,border:'1.5px solid rgba(0,0,0,0.07)',
                  background:'rgba(255,255,255,0.6)',cursor:'pointer',
                  fontFamily:'var(--font-b)',fontWeight:600,fontSize:'.85rem',
                  transition:'all .2s',textAlign:'left',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='translateX(4px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.6)';e.currentTarget.style.transform='translateX(0)'}}>
                  <span style={{fontSize:'1.1rem'}}>{a.icon}</span>
                  <span style={{color:'var(--c-dark)'}}>{a.label}</span>
                  <span style={{marginLeft:'auto',color:'var(--c-muted)',fontSize:'.8rem'}}>→</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FAB */}
      <button className="btn" onClick={onChat} style={{
        position:'fixed',bottom:36,right:36,width:60,height:60,borderRadius:20,
        fontSize:'1.4rem',padding:0,justifyContent:'center',
        boxShadow:'0 12px 36px rgba(0,180,160,0.45)',zIndex:50,
        animation:'glow 3s ease-in-out infinite',
      }} title="Open AI Assistant">
        ✦
      </button>
    </div>
  )
}

/* ─── CHATBOT ────────────────────────────────────────────────── */
function ChatBot({ onClose }) {
  const [msgs, setMsgs] = useState([{role:'ai',text:"Hi! I'm your CareSync AI. Ask me anything about your health, medications, or appointments."}])
  const [inp, setInp] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs, typing])

  const send = () => {
    if (!inp.trim()) return
    const txt = inp.trim()
    setMsgs(m => [...m,{role:'user',text:txt}])
    setInp('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs(m => [...m,{role:'ai',text:AI_REPLIES[Math.floor(Math.random()*AI_REPLIES.length)]}])
    }, 900 + Math.random()*700)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',padding:'24px'}}>
      {/* backdrop */}
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(9,14,26,0.35)',backdropFilter:'blur(6px)'}}/>

      {/* panel */}
      <div className="mui" style={{
        position:'relative', width:'100%', maxWidth:420, height:640, maxHeight:'90vh',
        borderRadius:28, overflow:'hidden', display:'flex', flexDirection:'column',
        background:'rgba(255,255,255,0.82)', backdropFilter:'blur(40px)',
        border:'1px solid rgba(255,255,255,0.65)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.4)',
      }}>

        {/* header */}
        <div style={{
          background:'linear-gradient(135deg,#060d1f,#0a2428)',
          padding:'20px 22px', display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:14,background:'rgba(0,180,160,0.2)',border:'1px solid rgba(0,180,160,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>
              ✦
            </div>
            <div>
              <p style={{color:'#fff',fontWeight:700,fontFamily:'var(--font-h)',fontSize:'.95rem'}}>CareSync AI</p>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',animation:'pulse 2s infinite'}}/>
                <p style={{color:'rgba(255,255,255,0.45)',fontSize:'.72rem'}}>Online · Clinical AI Assistant</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'1.2rem',display:'flex',alignItems:'center',justifyContent:'center',transition:'.2s'}}
          onMouseEnter={e=>e.target.style.background='rgba(255,255,255,0.2)'}
          onMouseLeave={e=>e.target.style.background='rgba(255,255,255,0.1)'}>
            ×
          </button>
        </div>

        {/* messages */}
        <div className="chat-area" style={{flex:1,overflowY:'auto',padding:'20px 16px',display:'flex',flexDirection:'column',gap:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:8}}>
              {m.role==='ai' && (
                <div style={{width:28,height:28,borderRadius:9,background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'.65rem',fontWeight:800,flexShrink:0,marginBottom:2}}>
                  AI
                </div>
              )}
              <div style={{
                maxWidth:'76%', padding:'11px 16px', borderRadius:18, fontSize:'.88rem', lineHeight:1.6,
                ...(m.role==='user'
                  ? {background:'linear-gradient(135deg,#00b4a0,#00d4c8)',color:'#fff',borderBottomRightRadius:4}
                  : {background:'#fff',color:'var(--c-dark)',border:'1px solid rgba(0,0,0,0.07)',borderBottomLeftRadius:4,boxShadow:'0 2px 12px rgba(0,0,0,0.05)'})
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
              <div style={{width:28,height:28,borderRadius:9,background:'linear-gradient(135deg,#00b4a0,#00d4c8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'.65rem',fontWeight:800,flexShrink:0}}>AI</div>
              <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:18,borderBottomLeftRadius:4,padding:'14px 18px',display:'flex',gap:5,alignItems:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.05)'}}>
                <div className="d1" style={{width:7,height:7,borderRadius:'50%',background:'var(--c-teal)'}}/>
                <div className="d2" style={{width:7,height:7,borderRadius:'50%',background:'var(--c-teal)'}}/>
                <div className="d3" style={{width:7,height:7,borderRadius:'50%',background:'var(--c-teal)'}}/>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* input */}
        <div style={{padding:'16px',borderTop:'1px solid rgba(0,0,0,0.06)',flexShrink:0,background:'rgba(255,255,255,0.6)'}}>
          <div style={{display:'flex',gap:10,alignItems:'center',background:'rgba(255,255,255,0.9)',borderRadius:50,border:'1.5px solid rgba(0,0,0,0.08)',padding:'8px 8px 8px 20px',transition:'border-color .2s',boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}
          onFocus={e=>{if(e.target.tagName==='INPUT') e.currentTarget.style.borderColor='var(--c-teal)'}}
          onBlur={e=>e.currentTarget.style.borderColor='rgba(0,0,0,0.08)'}>
            <input
              style={{flex:1,border:'none',outline:'none',background:'transparent',fontFamily:'var(--font-b)',fontSize:'.88rem',color:'var(--c-dark)'}}
              placeholder="Ask about your health…"
              value={inp}
              onChange={e=>setInp(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
            />
            <button className="btn" onClick={send} style={{width:38,height:38,padding:0,borderRadius:50,justifyContent:'center',flexShrink:0,boxShadow:'0 4px 14px rgba(0,180,160,0.35)'}}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{width:15,height:15}}>
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>
          <p style={{textAlign:'center',fontSize:'.68rem',color:'rgba(0,0,0,0.25)',marginTop:8}}>CareSync AI · For informational purposes only</p>
        </div>
      </div>
    </div>
  )
}

/* ─── ROOT ───────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState('landing')
  const [chat, setChat] = useState(false)
  const formRef = useRef(null)

  return (
    <>
      {view === 'landing'
        ? <Landing onEnter={() => setView('dashboard')} formRef={formRef} />
        : <Dashboard onChat={() => setChat(true)} />
      }
      {chat && <ChatBot onClose={() => setChat(false)} />}
    </>
  )
}
