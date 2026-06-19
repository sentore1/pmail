import React, { useState } from 'react'
import { Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import OnboardingFlow from './OnboardingFlow'
import { authAPI } from '../services/api'

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    phoneNumber: '', age: '', gender: '', country: '', knoccPrice: '1'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      // Switching to login from signup
      setShowOnboarding(false);
    } else {
      // Switching to signup - show onboarding
      setShowOnboarding(true);
    }
    setIsLogin(!isLogin)
    setStep(1)
    setError('')
  }

  // If showing onboarding flow, render that instead
  if (showOnboarding && !isLogin) {
    return <OnboardingFlow onComplete={onLogin} />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-6xl flex items-center gap-16">
        {/* Left Side - Form */}
        <div className="w-full max-w-md">
          {/* Logo - Top Left */}
          <div className="mb-12">
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8">
          {/* Back Button */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Title */}
          <h2 className="text-2xl font-normal text-gray-900 mb-2">
            {isLogin ? 'Sign in' : 'Create your pmail Account'}
          </h2>
          
          {step === 1 && (
            <p className="text-sm text-gray-600 mb-6">
              {isLogin ? 'to continue to pmail' : 'Enter your email to get started'}
            </p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-4">
            {/* Step 1: Email */}
            {step === 1 && (
              <div>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                  placeholder={isLogin ? 'Username or email' : 'Email'}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={switchMode}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isLogin ? 'Create account' : 'Sign in instead'}
                </button>
              </div>
            )}

            {/* Step 2: Password (Login) or Name + Password (Signup) */}
            {step === 2 && (
              <>
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                      placeholder="First and last name"
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                      placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                      autoFocus={isLogin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="mt-2 text-xs text-gray-600">
                      Use 8 or more characters with a mix of letters, numbers & symbols
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Profile Details (Signup only) */}
            {step === 3 && !isLogin && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Complete your profile</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Age (optional)</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
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

                <div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-2xl hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="1.00"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    This is what people will pay to send you a Knocc request
                  </p>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors text-sm"
              >
                {loading ? 'Please wait...' : step === 1 ? 'Next' : isLogin ? 'Sign in' : step === 2 ? 'Next' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

          {/* Footer */}
          <div className="mt-6">
            <p className="text-xs text-gray-600">
              By continuing, you agree to pmail's{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {' & '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Right Side - Large Pmail Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-9xl font-bold text-blue-600 tracking-tight lowercase" style={{ fontFamily: "'Jost', sans-serif" }}>
              pmail
            </h2>
            <p className="mt-4 text-xl text-gray-600 font-light">
              Professional email with Knocc
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
