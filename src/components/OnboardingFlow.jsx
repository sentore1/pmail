import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2, Check, X } from 'lucide-react'
import { authAPI } from '../services/api'
import TermsOfService from './TermsOfService'
import PrivacyPolicy from './PrivacyPolicy'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const COUNTRY_DIAL = {
  'Afghanistan': '+93', 'Albania': '+355', 'Algeria': '+213', 'Andorra': '+376',
  'Angola': '+244', 'Antigua and Barbuda': '+1-268', 'Argentina': '+54',
  'Armenia': '+374', 'Australia': '+61', 'Austria': '+43', 'Azerbaijan': '+994',
  'Bahamas': '+1-242', 'Bahrain': '+973', 'Bangladesh': '+880', 'Barbados': '+1-246',
  'Belarus': '+375', 'Belgium': '+32', 'Belize': '+501', 'Benin': '+229',
  'Bhutan': '+975', 'Bolivia': '+591', 'Bosnia and Herzegovina': '+387',
  'Botswana': '+267', 'Brazil': '+55', 'Brunei': '+673', 'Bulgaria': '+359',
  'Burkina Faso': '+226', 'Burundi': '+257', 'Cambodia': '+855', 'Cameroon': '+237',
  'Canada': '+1', 'Cape Verde': '+238', 'Central African Republic': '+236',
  'Chad': '+235', 'Chile': '+56', 'China': '+86', 'Colombia': '+57',
  'Comoros': '+269', 'Congo': '+242', 'Costa Rica': '+506', 'Croatia': '+385',
  'Cuba': '+53', 'Cyprus': '+357', 'Czech Republic': '+420', 'Denmark': '+45',
  'Djibouti': '+253', 'Dominica': '+1-767', 'Dominican Republic': '+1-809',
  'DR Congo': '+243', 'Ecuador': '+593', 'Egypt': '+20', 'El Salvador': '+503',
  'Equatorial Guinea': '+240', 'Eritrea': '+291', 'Estonia': '+372',
  'Eswatini': '+268', 'Ethiopia': '+251', 'Fiji': '+679', 'Finland': '+358',
  'France': '+33', 'Gabon': '+241', 'Gambia': '+220', 'Georgia': '+995',
  'Germany': '+49', 'Ghana': '+233', 'Greece': '+30', 'Grenada': '+1-473',
  'Guatemala': '+502', 'Guinea': '+224', 'Guinea-Bissau': '+245', 'Guyana': '+592',
  'Haiti': '+509', 'Honduras': '+504', 'Hungary': '+36', 'Iceland': '+354',
  'India': '+91', 'Indonesia': '+62', 'Iran': '+98', 'Iraq': '+964',
  'Ireland': '+353', 'Israel': '+972', 'Italy': '+39', 'Ivory Coast': '+225',
  'Jamaica': '+1-876', 'Japan': '+81', 'Jordan': '+962', 'Kazakhstan': '+7',
  'Kenya': '+254', 'Kiribati': '+686', 'Kuwait': '+965', 'Kyrgyzstan': '+996',
  'Laos': '+856', 'Latvia': '+371', 'Lebanon': '+961', 'Lesotho': '+266',
  'Liberia': '+231', 'Libya': '+218', 'Liechtenstein': '+423', 'Lithuania': '+370',
  'Luxembourg': '+352', 'Madagascar': '+261', 'Malawi': '+265', 'Malaysia': '+60',
  'Maldives': '+960', 'Mali': '+223', 'Malta': '+356', 'Marshall Islands': '+692',
  'Mauritania': '+222', 'Mauritius': '+230', 'Mexico': '+52',
  'Micronesia': '+691', 'Moldova': '+373', 'Monaco': '+377', 'Mongolia': '+976',
  'Montenegro': '+382', 'Morocco': '+212', 'Mozambique': '+258', 'Myanmar': '+95',
  'Namibia': '+264', 'Nauru': '+674', 'Nepal': '+977', 'Netherlands': '+31',
  'New Zealand': '+64', 'Nicaragua': '+505', 'Niger': '+227', 'Nigeria': '+234',
  'North Korea': '+850', 'North Macedonia': '+389', 'Norway': '+47', 'Oman': '+968',
  'Pakistan': '+92', 'Palau': '+680', 'Palestine': '+970', 'Panama': '+507',
  'Papua New Guinea': '+675', 'Paraguay': '+595', 'Peru': '+51',
  'Philippines': '+63', 'Poland': '+48', 'Portugal': '+351', 'Qatar': '+974',
  'Romania': '+40', 'Russia': '+7', 'Rwanda': '+250',
  'Saint Kitts and Nevis': '+1-869', 'Saint Lucia': '+1-758',
  'Saint Vincent and the Grenadines': '+1-784', 'Samoa': '+685',
  'San Marino': '+378', 'Saudi Arabia': '+966', 'Senegal': '+221', 'Serbia': '+381',
  'Seychelles': '+248', 'Sierra Leone': '+232', 'Singapore': '+65',
  'Slovakia': '+421', 'Slovenia': '+386', 'Solomon Islands': '+677',
  'Somalia': '+252', 'South Africa': '+27', 'South Korea': '+82',
  'South Sudan': '+211', 'Spain': '+34', 'Sri Lanka': '+94', 'Sudan': '+249',
  'Suriname': '+597', 'Sweden': '+46', 'Switzerland': '+41', 'Syria': '+963',
  'Taiwan': '+886', 'Tajikistan': '+992', 'Tanzania': '+255', 'Thailand': '+66',
  'Timor-Leste': '+670', 'Togo': '+228', 'Tonga': '+676',
  'Trinidad and Tobago': '+1-868', 'Tunisia': '+216', 'Turkey': '+90',
  'Turkmenistan': '+993', 'Tuvalu': '+688', 'Uganda': '+256', 'Ukraine': '+380',
  'United Arab Emirates': '+971', 'United Kingdom': '+44', 'United States': '+1',
  'Uruguay': '+598', 'Uzbekistan': '+998', 'Vanuatu': '+678', 'Vatican City': '+39',
  'Venezuela': '+58', 'Vietnam': '+84', 'Yemen': '+967', 'Zambia': '+260',
  'Zimbabwe': '+263',
}

const COUNTRIES = Object.keys(COUNTRY_DIAL).sort()

function OnboardingFlow({ onComplete, onBack }) {
  const [step, setStep] = useState(1)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — name
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Step 2 — username + password
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('idle') // idle | checking | available | taken
  const [usernameSuggestions, setUsernameSuggestions] = useState([])
  const [nameSuggestions, setNameSuggestions] = useState([]) // derived from first/last name
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const usernameTimer = useRef(null)

  // ── Generate username candidates from first + last name ───────────────────
  const buildNameSuggestions = (first, last) => {
    const f = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const l = last.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!f) return []
    const candidates = []
    if (f && l) {
      candidates.push(`${f}.${l}`)       // john.smith
      candidates.push(`${f[0]}${l}`)     // jsmith
    } else {
      candidates.push(f)
    }
    return [...new Set(candidates)]
  }

  // Step 3 — profile details (pre-filled by engine)
  const [profile, setProfile] = useState({ phoneNumber: '', age: '', gender: '', country: '', knoccPrice: '1' })

  const [engineStatus, setEngineStatus] = useState('idle')
  const engineFired = useRef(false)
  const geoFetched  = useRef(false)

  // ── Pre-fetch location from IP on mount — sets country+dial before step 3 ─
  // Uses /scrape-user-data with no name so timezone detection runs immediately
  useEffect(() => {
    if (geoFetched.current) return
    geoFetched.current = true
    const prefetch = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
        const language = navigator.language || null
        console.debug('[pmail] prefetch - TZ:', timezone, 'Lang:', language)
        const r = await fetch(`${API_URL}/intelligence/scrape-user-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '', email: '', timezone, language }),
        })
        if (r.ok) {
          const d = (await r.json())?.data || {}
          console.debug('[pmail] prefetch result:', d)
          if (d.country || d.dialCode) {
            setProfile(prev => ({
              ...prev,
              country:     d.country || prev.country,
              phoneNumber: d.dialCode || prev.phoneNumber,
            }))
          }
        }
      } catch (err) { 
        console.error('[pmail] prefetch error:', err)
      }
    }
    prefetch()
  }, [])

  // ── Fire intelligence engine when name is typed ────────────────────────────
  useEffect(() => {
    const full = `${firstName.trim()} ${lastName.trim()}`
    if (full.length < 4 || engineFired.current) return
    const timer = setTimeout(() => {
      if (engineFired.current) return
      engineFired.current = true
      runEngine(full)
    }, 800)
    return () => clearTimeout(timer)
  }, [firstName, lastName])

  const runEngine = async (fullName) => {
    setEngineStatus('running')
    const gathered = {}
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
    const language = navigator.language || null
    try {
      const r = await fetch(`${API_URL}/intelligence/scrape-user-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email: '', timezone, language }),
      })
      if (r.ok) {
        const d = (await r.json())?.data || {}
        if (d.country)  gathered.country        = d.country
        if (d.dialCode) gathered.dialCode        = d.dialCode
        if (d.gender)   gathered.gender          = d.gender
        if (d.age)      gathered.age             = d.age
        if (d.signals?.source) gathered.source   = d.signals.source
        console.debug('[pmail] engine result:', d.signals?.source, d)
      }
    } catch (err) { 
      console.error('[pmail] engine error:', err)
    }

    setProfile(prev => {
      const next = { ...prev }
      const isPublicFigure = gathered.source === 'public_figure'

      // Public figure data always wins — it's more accurate than IP for that person
      // For regular users with name, trust timezone detection over IP-only prefetch
      if (gathered.country) {
        next.country = gathered.country
      }
      if (gathered.gender) {
        next.gender = gathered.gender
      }
      if (gathered.age) {
        next.age = String(gathered.age)
      }
      // Always update phone dial code to match the detected country
      if (gathered.dialCode) {
        next.phoneNumber = gathered.dialCode
      }
      
      console.debug('[pmail] profile updated:', next)
      return next
    })
    setEngineStatus(Object.keys(gathered).length > 0 ? 'done' : 'failed')
  }

  // ── Username availability check (debounced) ───────────────────────────────
  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); setUsernameSuggestions([]); return }
    setUsernameStatus('checking')
    clearTimeout(usernameTimer.current)
    usernameTimer.current = setTimeout(async () => {
      try {
        const data = await authAPI.checkUsername(username)
        if (data.available) {
          setUsernameStatus('available')
          setUsernameSuggestions([])
        } else {
          setUsernameStatus('taken')
          setUsernameSuggestions(data.suggestions || [])
        }
      } catch {
        setUsernameStatus('idle')
      }
    }, 600)
    return () => clearTimeout(usernameTimer.current)
  }, [username])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async (e) => {
    e.preventDefault()
    setError('')

    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name'); return }
      // Pre-fill username from name
      const suggestions = buildNameSuggestions(firstName, lastName)
      setNameSuggestions(suggestions)
      if (suggestions.length > 0 && !username) {
        setUsername(suggestions[0])
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!username.trim()) { setError('Please choose a username'); return }
      if (usernameStatus === 'taken') { setError('That username is taken — pick another'); return }
      if (usernameStatus === 'checking') { setError('Still checking availability…'); return }
      if (!password) { setError('Please create a password'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
      setStep(3)
      return
    }

    if (step === 3) await handleRegister()
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authAPI.register({
        name: `${firstName.trim()} ${lastName.trim()}`,
        username: username.trim(),
        password,
        phoneNumber: profile.phoneNumber || null,
        age: profile.age ? parseInt(profile.age) : null,
        gender: profile.gender || null,
        country: profile.country || null,
        knoccPrice: parseFloat(profile.knoccPrice) || 1,
      })
      if (response.token && response.user) {
        onComplete(response.user, response.token)
      } else {
        setError(response.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full max-w-xs px-3 py-2 border-0 rounded-2xl focus:outline-none text-sm bg-gray-100 placeholder-gray-400'
  const inputSmCls = 'w-full px-3 py-1.5 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-gray-400 text-sm bg-white'

  return (
    <div className="relative min-h-screen bg-white flex flex-col p-8">
      {showTerms && <TermsOfService onBack={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyPolicy onBack={() => setShowPrivacy(false)} />}
      {!showTerms && !showPrivacy && (<>
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-6xl flex items-center gap-16">

        {/* Form */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8">
            <div className="mb-10">
              <img src="/pryro logo.png" alt="Pmail logo" className="w-14 h-14 object-contain" />
            </div>
            {step === 1 ? (
              <button onClick={onBack}
                className="flex items-center gap-1 text-gray-900 hover:text-black text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button onClick={() => { setError(''); setStep(s => s - 1) }}
                className="flex items-center gap-1 text-gray-900 hover:text-black text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            <h2 className="text-2xl font-normal text-gray-900 mb-2">Create your Pmail Account</h2>
            {step === 1 && <p className="text-sm text-gray-600 mb-6">Start with your name</p>}
            {step === 2 && <p className="text-sm text-gray-600 mb-6">Choose your Pmail address</p>}
            {step === 3 && <p className="text-sm text-gray-600 mb-6">Almost there — fill in your profile</p>}

            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleNext} className="space-y-4">

              {/* Step 1: Name */}
              {step === 1 && (
                <>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="First name" autoFocus className={inputCls} />
                  <div className="flex items-center gap-3">
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                      placeholder="Last name" className={inputCls} />
                    <button type="submit" disabled={loading}
                      className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex items-center gap-2 flex-shrink-0">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Creating account…' : 'Next'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Username + Password */}
              {step === 2 && (
                <>
                  {/* Username picker */}
                  <div className="step2-container">
                    {/* Name-based suggestions — right-aligned next to nothing (no label) */}
                    {nameSuggestions.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {nameSuggestions.map(s => (
                          <button key={s} type="button"
                            onClick={() => setUsername(s)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                              username === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center max-w-xs border border-gray-300 rounded-2xl hover:border-gray-400 focus-within:border-gray-400 bg-white overflow-hidden">
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="yourname"
                        autoComplete="off"
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
                      />
                      <span className="text-gray-400 text-base pr-2 whitespace-nowrap select-none">@pryro.com</span>
                      <div className="pr-3">
                        {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                        {usernameStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                        {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>

                    {/* Suggestions when taken */}
                    {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1.5">Try one of these:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {usernameSuggestions.map(s => (
                            <button key={s} type="button"
                              onClick={() => setUsername(s)}
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mt-1.5 text-xs text-gray-400">Only letters, numbers, . _ - allowed</p>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center max-w-xs bg-gray-100 rounded-2xl overflow-hidden">
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0 placeholder-gray-400" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="pr-3 text-gray-500 hover:text-gray-700 flex-shrink-0">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Confirm password" className={inputCls} />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Use 8 or more characters</p>
                    </div>
                    <button type="submit" disabled={loading || usernameStatus === 'checking'}
                      className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex items-center gap-2 flex-shrink-0">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Creating account…' : 'Next'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Profile details */}
              {step === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
                      <input type="tel" value={profile.phoneNumber}
                        onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                        placeholder="+1234567890" className={inputSmCls} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Age (optional)</label>
                      <input type="number" value={profile.age}
                        onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                        placeholder="25" min="13" max="120" className={inputSmCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Gender (optional)</label>
                      <select value={profile.gender}
                        onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                        className={inputSmCls}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Country</label>
                      <select value={profile.country}
                        onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                        className={inputSmCls}>
                        <option value="">Select Country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-700 mb-1">Knocc Price ($)</label>
                      <input type="number" value={profile.knoccPrice}
                        onChange={e => setProfile(p => ({ ...p, knoccPrice: e.target.value }))}
                        min="1" step="0.01" placeholder="1.00" className={inputSmCls} />
                      <p className="mt-1 text-xs text-gray-500">What people pay to send you a Knocc request</p>
                    </div>
                    <button type="submit" disabled={loading}
                      className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex items-center gap-2 flex-shrink-0 self-start mt-6">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          <div className="mt-2 px-8">
          </div>
        </div>

        {/* Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-9xl text-blue-600 tracking-tight leading-none"
              style={{ fontFamily: "'Alice', serif", color: '#0184ff', fontSize: '180px' }}>pmail</h2>
          </div>
        </div>
      </div>
      </div>

      {/* Footer - pinned to bottom left */}
      <div className="absolute bottom-4 right-8 text-right">
        <p className="text-sm text-gray-500 font-light leading-none">Professional email with Knocc — An inbox for people worth reaching.</p>
        <p className="text-xs text-gray-400">
          By continuing, you agree to pmail's{' '}
          <button type="button" onClick={() => setShowTerms(true)} className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Terms of Service</button>
          {' & '}
          <button type="button" onClick={() => setShowPrivacy(true)} className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Privacy Policy</button>
          {' · by pryro:148431003'}
        </p>
      </div>
      </>)}
    </div>
  )
}

export default OnboardingFlow
