import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2, Check, X, AtSign } from 'lucide-react'
import { authAPI } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const COUNTRY_DIAL = {
  'United States': '+1', 'Canada': '+1', 'United Kingdom': '+44',
  'Australia': '+61', 'Germany': '+49', 'France': '+33', 'Spain': '+34',
  'Italy': '+39', 'Netherlands': '+31', 'Sweden': '+46', 'Norway': '+47',
  'Denmark': '+45', 'Finland': '+358', 'Switzerland': '+41', 'Austria': '+43',
  'Belgium': '+32', 'Ireland': '+353', 'Poland': '+48', 'Portugal': '+351',
  'Greece': '+30', 'Japan': '+81', 'South Korea': '+82', 'China': '+86',
  'India': '+91', 'Singapore': '+65', 'Malaysia': '+60', 'Thailand': '+66',
  'Indonesia': '+62', 'Philippines': '+63', 'Vietnam': '+84',
  'New Zealand': '+64', 'Mexico': '+52', 'Brazil': '+55', 'Argentina': '+54',
  'Chile': '+56', 'Colombia': '+57', 'South Africa': '+27', 'Nigeria': '+234',
  'Kenya': '+254', 'Egypt': '+20', 'United Arab Emirates': '+971',
  'Saudi Arabia': '+966', 'Israel': '+972', 'Turkey': '+90', 'Russia': '+7',
  'Ukraine': '+380',
}

const COUNTRIES = Object.keys(COUNTRY_DIAL).concat(['Czech Republic', 'Hungary', 'Romania', 'Other']).sort()

function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(1)
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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const usernameTimer = useRef(null)

  // Step 3 — profile details (pre-filled by engine)
  const [profile, setProfile] = useState({ phoneNumber: '', age: '', gender: '', country: '', knoccPrice: '1' })

  const [engineStatus, setEngineStatus] = useState('idle')
  const engineFired = useRef(false)

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
        if (d.country)  gathered.country  = d.country
        if (d.dialCode) gathered.dialCode = d.dialCode
        if (d.gender)   gathered.gender   = d.gender
      }
    } catch { /* silent */ }

    if (!gathered.country) {
      try {
        const r = await fetch(`${API_URL}/intelligence/geoip`)
        if (r.ok) { const g = await r.json(); if (g.country) gathered.country = g.country }
      } catch { /* silent */ }
    }

    setProfile(prev => {
      const next = { ...prev }
      if (gathered.country && !prev.country) next.country = gathered.country
      if (gathered.gender  && !prev.gender)  next.gender  = gathered.gender
      if (!prev.phoneNumber) {
        const dial = gathered.dialCode || (gathered.country ? COUNTRY_DIAL[gathered.country] : null)
        if (dial) next.phoneNumber = dial
      }
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

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base bg-white'
  const inputSmCls = 'w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-6xl flex items-center gap-16">

        {/* Form */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8">
            {step > 1 && (
              <button onClick={() => { setError(''); setStep(s => s - 1) }}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            <h2 className="text-2xl font-normal text-gray-900 mb-2">Create your Pmail Account</h2>
            {step === 1 && <p className="text-sm text-gray-600 mb-6">Start with your name</p>}
            {step === 2 && <p className="text-sm text-gray-600 mb-6">Choose your Pmail address</p>}
            {step === 3 && <p className="text-sm text-gray-600 mb-6">Almost there — fill in your profile</p>}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleNext} className="space-y-4">

              {/* Step 1: Name */}
              {step === 1 && (
                <>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="First name" autoFocus className={inputCls} />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Last name" className={inputCls} />
                  <div className="h-4">
                    {engineStatus === 'running' && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Setting up your profile…
                      </span>
                    )}
                    {engineStatus === 'done' && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Profile ready
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Username + Password */}
              {step === 2 && (
                <>
                  {/* Username picker */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">Choose your username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="yourname"
                        autoFocus
                        className={`${inputCls} pr-10`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                        {usernameStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                        {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>

                    {/* Live email preview */}
                    {username && (
                      <div className={`mt-2 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${
                        usernameStatus === 'available' ? 'bg-green-50 text-green-700' :
                        usernameStatus === 'taken'     ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        <AtSign className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium">{username}@pryro.com</span>
                        {usernameStatus === 'available' && <span className="ml-auto text-xs">Available ✓</span>}
                        {usernameStatus === 'taken'     && <span className="ml-auto text-xs">Taken</span>}
                      </div>
                    )}

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
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Create a password" className={inputCls} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password" className={inputCls} />
                  <p className="text-xs text-gray-500">Use 8 or more characters</p>
                </>
              )}

              {/* Step 3: Profile details */}
              {step === 3 && (
                <>
                  {/* Show the final email */}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-500 font-medium">Your Pmail address</p>
                      <p className="text-blue-700 font-semibold">{username}@pryro.com</p>
                    </div>
                  </div>

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

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Knocc Price ($)</label>
                    <input type="number" value={profile.knoccPrice}
                      onChange={e => setProfile(p => ({ ...p, knoccPrice: e.target.value }))}
                      min="1" step="0.01" placeholder="1.00" className={inputSmCls} />
                    <p className="mt-1 text-xs text-gray-500">What people pay to send you a Knocc request</p>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={loading || (step === 2 && usernameStatus === 'checking')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex items-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creating account…' : step === 3 ? 'Create account' : 'Next'}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-2 px-8">
            <p className="text-xs text-gray-600">
              By continuing, you agree to Pmail's{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {' & '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-9xl font-bold text-blue-600 tracking-tight lowercase"
              style={{ fontFamily: "'Jost', sans-serif" }}>pmail</h2>
            <p className="mt-4 text-xl text-gray-600 font-light">Professional email with Knocc</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow
