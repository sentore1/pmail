import React, { useState, useEffect, useRef } from 'react'
import { Mail, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import OnboardingFlow from './OnboardingFlow'
import TermsOfService from './TermsOfService'
import PrivacyPolicy from './PrivacyPolicy'
import { authAPI } from '../services/api'

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    phoneNumber: '', age: '', gender: '', country: '', knoccPrice: '1'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Auto-suggest (gender / country / age) ──────────────────────────────────
  const [suggestions, setSuggestions] = useState({})
  const suggestTimer = useRef(null)

  // Fire when name changes — debounced 400ms, sends timezone + language for best accuracy
  useEffect(() => {
    if (isLogin || !formData.name || formData.name.trim().length < 3) {
      setSuggestions({})
      return
    }
    clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const lang = navigator.language || navigator.languages?.[0] || null
        const data = await authAPI.suggest(formData.name.trim(), tz, lang)
        if (data.confidence > 0) setSuggestions(data)
      } catch { /* silent — suggestions are optional */ }
    }, 400)
    return () => clearTimeout(suggestTimer.current)
  }, [formData.name, isLogin])

  // ── Forgot / Reset password state ──────────────────────────────────────────
  const [view, setView] = useState('auth') // 'auth' | 'forgot' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [tokenValid, setTokenValid] = useState(null) // null=checking, true, false

  // Check URL for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      setView('reset')
      // Verify token is still valid
      authAPI.verifyResetToken(token)
        .then(data => setTokenValid(data.valid))
        .catch(() => setTokenValid(false))
    }
  }, [])

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) { setError('Please enter your username or email'); return }
    setLoading(true)
    setError('')
    try {
      await authAPI.forgotPassword(forgotEmail.trim())
      setForgotSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetPassword) { setError('Please enter a new password'); return }
    if (resetPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (resetPassword !== resetConfirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await authAPI.resetPassword(resetToken, resetPassword)
      setResetDone(true)
      // Clean the token from the URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async (e) => {
    e.preventDefault()
    setError('')

    // Step 1: Email validation
    if (step === 1) {
      if (!formData.email) {
        setError('Please enter your email')
        return
      }
      setStep(2)
      return
    }

    // Step 2: Password (Login) or Name + Password (Signup)
    if (step === 2) {
      if (isLogin) {
        // Login - submit now
        await handleLogin()
      } else {
        // Signup - check name and password, then go to step 3
        if (!formData.name || !formData.password) {
          setError('Please enter your name and password')
          return
        }
        setStep(3)
      }
      return
    }

    // Step 3: Profile details (Signup only)
    if (step === 3 && !isLogin) {
      await handleSignup()
      return
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      const data = await authAPI.login(formData.email, formData.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.user, data.token)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setLoading(true)
    try {
      const data = await authAPI.register(formData)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.user, data.token)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleBack = () => {
    setError('')
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const switchMode = () => {
    if (!isLogin) {
      setShowOnboarding(false);
    } else {
      setShowOnboarding(true);
    }
    setIsLogin(!isLogin)
    setStep(1)
    setError('')
    setSuggestions({})
  }

  // If showing onboarding flow, render that instead
  if (showOnboarding && !isLogin) {
    return <OnboardingFlow onComplete={onLogin} onBack={() => setShowOnboarding(false)} />;
  }

  if (showTerms) {
    return <TermsOfService onBack={() => setShowTerms(false)} />
  }

  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  }

  // ── Forgot Password View ────────────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-6xl flex items-center gap-16">
          <div className="w-full max-w-md">
            <div className="rounded-3xl p-8">
              <div className="mb-6">
                <img src="/pryro logo.png" alt="Pmail logo" className="w-14 h-14 object-contain" />
              </div>
              <button
                onClick={() => { setView('auth'); setForgotSent(false); setForgotEmail(''); setError('') }}
                className="flex items-center gap-1 text-gray-900 hover:text-black text-sm mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>

              {forgotSent ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-normal text-gray-900 mb-2">Check your email</h2>
                  <p className="text-sm text-gray-600 mb-2">
                    If an account exists for <strong>{forgotEmail}</strong>, we sent a password reset link to that address.
                  </p>
                  <p className="text-sm text-gray-500">The link expires in 1 hour.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-normal text-gray-900 mb-2">Forgot password?</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter your username or email and we'll send you a reset link.
                  </p>
                  {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                        placeholder="Username or email"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-[#0184ff] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex-shrink-0"
                      >
                        {loading ? 'Sending...' : 'Send link'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="tracking-tight leading-none" style={{ fontFamily: "'Alice', serif", color: '#0184ff', fontSize: '180px' }}>pmail</h2>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Reset Password View ─────────────────────────────────────────────────────
  if (view === 'reset') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-6xl flex items-center gap-16">
          <div className="w-full max-w-md">
            <div className="rounded-3xl p-8">
              <div className="mb-6">
                <img src="/pryro logo.png" alt="Pmail logo" className="w-14 h-14 object-contain" />
              </div>

              {/* Checking token */}
              {tokenValid === null && (
                <p className="text-sm text-gray-600">Verifying your reset link…</p>
              )}

              {/* Invalid / expired token */}
              {tokenValid === false && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-500 text-2xl">✕</span>
                  </div>
                  <h2 className="text-2xl font-normal text-gray-900 mb-2">Link expired</h2>
                  <p className="text-sm text-gray-600 mb-6">This reset link is invalid or has expired. Please request a new one.</p>
                  <button
                    onClick={() => { setView('forgot'); setTokenValid(null); setError('') }}
                    className="px-6 py-2 bg-[#0184ff] hover:bg-[#0070e0] text-white rounded-2xl font-medium text-sm"
                  >
                    Request new link
                  </button>
                </div>
              )}

              {/* Success */}
              {tokenValid === true && resetDone && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-normal text-gray-900 mb-2">Password updated!</h2>
                  <p className="text-sm text-gray-600 mb-6">Your password has been changed. You can now sign in with your new password.</p>
                  <button
                    onClick={() => { setView('auth'); setResetDone(false); setResetToken(''); setError('') }}
                    className="px-6 py-2 bg-[#0184ff] hover:bg-[#0070e0] text-white rounded-2xl font-medium text-sm"
                  >
                    Sign in
                  </button>
                </div>
              )}

              {/* Reset form */}
              {tokenValid === true && !resetDone && (
                <>
                  <h2 className="text-2xl font-normal text-gray-900 mb-2">Set new password</h2>
                  <p className="text-sm text-gray-600 mb-6">Choose a new password for your account.</p>
                  {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {/* New password */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">New password</label>
                      <div className="flex items-center bg-gray-100 rounded-2xl overflow-hidden max-w-xs">
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder-gray-400"
                          placeholder="At least 8 characters"
                          autoFocus
                        />
                        <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="pr-3 text-gray-500 hover:text-gray-700">
                          {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Confirm password */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Confirm password</label>
                      <div className="flex items-center bg-gray-100 rounded-2xl overflow-hidden max-w-xs">
                        <input
                          type={showResetConfirm ? 'text' : 'password'}
                          value={resetConfirm}
                          onChange={e => setResetConfirm(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder-gray-400"
                          placeholder="Repeat new password"
                        />
                        <button type="button" onClick={() => setShowResetConfirm(!showResetConfirm)} className="pr-3 text-gray-500 hover:text-gray-700">
                          {showResetConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-[#0184ff] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm"
                    >
                      {loading ? 'Updating...' : 'Update password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="tracking-tight leading-none" style={{ fontFamily: "'Alice', serif", color: '#0184ff', fontSize: '180px' }}>pmail</h2>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white flex flex-col p-8">
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-6xl flex items-center gap-16">
        {/* Left Side - Form */}
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl p-8">
          {/* Logo above Sign in */}
          <div className="mb-10">
            <img src="/pryro logo.png" alt="Pmail logo" className="w-14 h-14 object-contain" />
          </div>
          {/* Back Button */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-900 hover:text-black text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Title */}
          <h2 className="text-2xl font-normal text-gray-900 mb-2">
            {isLogin ? 'Sign in' : 'Create your pmail Account'}
          </h2>
          {/* deploy-test: remove this line after confirming auto-deploy works */}
          <p className="text-xs text-gray-400 mb-1">v{new Date('2026-11-28').toISOString().slice(0,10)}</p>
          
          {step === 1 && (
            <p className="text-sm text-gray-600 mb-6">
              {isLogin ? 'to continue to pmail' : 'Enter your email to get started'}
            </p>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-4">
            {/* Step 1: Email */}
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full max-w-xs px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                    placeholder={isLogin ? 'Username or email' : 'Email'}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex-shrink-0"
                  >
                    Next
                  </button>
                </div>
                <button
                  type="button"
                  onClick={switchMode}
                  className="mt-3 text-sm font-medium hover:opacity-80" style={{ color: '#0184ff' }}
                >
                  {isLogin ? 'Create account' : 'Sign in instead'}
                </button>
              </div>
            )}

            {/* Step 2: Password (Login) or Name + Password (Signup) */}
            {step === 2 && (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-2xl text-sm">
                  <span className="text-gray-600">Email: </span>
                  <span className="text-gray-900 font-medium">{formData.email}</span>
                </div>

                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full max-w-xs px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                      placeholder="First and last name"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center max-w-xs bg-gray-100 border-0 rounded-2xl overflow-hidden">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="current-password"
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0 placeholder-gray-400"
                        placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                        autoFocus={isLogin}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="pr-3 text-gray-500 hover:text-gray-700 flex-shrink-0"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {!isLogin && (
                      <p className="mt-2 text-xs text-gray-600">
                        Use 8 or more characters with a mix of letters, numbers & symbols
                      </p>
                    )}
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setView('forgot'); setError(''); setForgotEmail(formData.email || '') }}
                        className="mt-2 text-sm font-medium hover:opacity-80" style={{ color: '#0184ff' }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex-shrink-0"
                  >
                    {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Next'}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Profile Details (Signup only) */}
            {step === 3 && !isLogin && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Complete your profile</h3>

                {/* Suggestion chips — appear when backend inferred something */}
                {(suggestions.gender || suggestions.country || suggestions.ageRange) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-2xl">
                    <p className="text-xs text-blue-500 font-medium mb-2">Suggested for you</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.gender && !formData.gender && (
                        <button
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, gender: suggestions.gender }))}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <span className="text-blue-400">Gender</span>
                          <span className="font-medium capitalize">{suggestions.gender}</span>
                          <span className="text-blue-300 text-[10px]">tap to apply</span>
                        </button>
                      )}
                      {suggestions.country && !formData.country && (
                        <button
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, country: suggestions.country }))}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <span className="text-blue-400">Country</span>
                          <span className="font-medium">{suggestions.country}</span>
                          {suggestions.dialCode && <span className="text-blue-400">{suggestions.dialCode}</span>}
                          <span className="text-blue-300 text-[10px]">tap to apply</span>
                        </button>
                      )}
                      {suggestions.ageRange && !formData.age && (
                        <button
                          type="button"
                          onClick={() => {
                            const mid = suggestions.ageRange.split('-')
                            const midAge = Math.round((parseInt(mid[0]) + parseInt(mid[1])) / 2)
                            setFormData(f => ({ ...f, age: String(midAge) }))
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <span className="text-blue-400">Age range</span>
                          <span className="font-medium">{suggestions.ageRange}</span>
                          <span className="text-blue-300 text-[10px]">tap to apply</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-400 mt-1.5">Inferred from your name · you can change these</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                      placeholder={suggestions.dialCode ? `${suggestions.dialCode} ...` : '+1234567890'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Age (optional)</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Gender (optional)</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm"
                    >
                      <option value="">Select Country</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Spain">Spain</option>
                      <option value="Italy">Italy</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Norway">Norway</option>
                      <option value="Denmark">Denmark</option>
                      <option value="Finland">Finland</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Austria">Austria</option>
                      <option value="Belgium">Belgium</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Poland">Poland</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Greece">Greece</option>
                      <option value="Japan">Japan</option>
                      <option value="South Korea">South Korea</option>
                      <option value="China">China</option>
                      <option value="India">India</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Chile">Chile</option>
                      <option value="Colombia">Colombia</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Egypt">Egypt</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Israel">Israel</option>
                      <option value="Turkey">Turkey</option>
                      <option value="Russia">Russia</option>
                      <option value="Ukraine">Ukraine</option>
                      <option value="Czech Republic">Czech Republic</option>
                      <option value="Hungary">Hungary</option>
                      <option value="Romania">Romania</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-700 mb-1">
                      Knocc Price ($)
                    </label>
                    <input
                      type="number"
                      name="knoccPrice"
                      value={formData.knoccPrice}
                      onChange={handleChange}
                      min="1"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none text-sm placeholder-gray-400"
                      placeholder="1.00"
                    />
                    <p className="mt-1 text-xs text-gray-600">
                      This is what people will pay to send you a Knocc request
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-[#0085FF] hover:bg-[#0070e0] disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm flex-shrink-0 mt-6"
                  >
                    {loading ? 'Please wait...' : 'Create account'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        </div>

        {/* Right Side - Large Pmail Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="tracking-tight leading-none" style={{ fontFamily: "'Alice', serif", color: '#0184ff', fontSize: '180px' }}>
              pmail
            </h2>
          </div>
        </div>
      </div>
      </div>

      {/* Footer - pinned to bottom right */}
      <div className="absolute bottom-4 right-8 text-right">
        <p className="text-sm text-gray-500 font-light leading-none">Professional email with Knocc — An inbox for people worth reaching.</p>
        <p className="text-xs text-gray-400">
          By continuing, you agree to pmail's{' '}
          <button type="button" onClick={() => setShowTerms(true)} className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Terms of Service</button>
          {' & '}
          <button type="button" onClick={() => setShowPrivacy(true)} className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Privacy Policy</button>
          {' · by pryro.com | 148431003'}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
