/**
 * InboundSendPage.jsx
 *
 * Standalone form shown when an external sender navigates to:
 *   /?send=<pryro-username-or-email>
 *
 * They fill in their name, email, subject and message.
 * On submit, POST /api/inbound/submit creates the InboundRequest.
 * If a fee is required, we redirect them to the payment page.
 */

import React, { useState } from 'react'
import { Mail, Send, AlertCircle, CheckCircle, ArrowRight, User, Lock } from 'lucide-react'
import { inboundAPI } from '../services/api'

export default function InboundSendPage({ recipientEmail }) {
  const [form, setForm] = useState({
    externalEmail: '',
    externalName: '',
    subject: '',
    body: '',
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState(null) // { delivered, payUrl, inboundFee, message }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.externalEmail.trim()) { setError('Your email address is required'); return }
    if (!form.subject.trim()) { setError('Subject is required'); return }
    if (!form.body.trim()) { setError('Message is required'); return }

    setLoading(true)
    setError('')
    try {
      const res = await inboundAPI.submit({
        recipientEmail: recipientEmail,
        externalEmail:  form.externalEmail.trim(),
        externalName:   form.externalName.trim(),
        subject:        form.subject.trim(),
        body:           form.body.trim(),
      })
      setResult(res)

      // If a payment link was returned, redirect after a brief moment
      if (res.payUrl) {
        setTimeout(() => {
          window.location.href = res.payUrl
        }, 2000)
      }
    } catch (err) {
      setError(err.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  // ── Success: free delivery ─────────────────────────────────────────────────
  if (result?.delivered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Message Delivered!</h1>
          <p className="text-sm text-gray-500">
            Your message has been delivered to {recipientEmail} on Pryro.
          </p>
        </div>
      </div>
    )
  }

  // ── Success: payment required, redirecting ────────────────────────────────
  if (result?.payUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Almost there…</h1>
          <p className="text-sm text-gray-500">
            {result.message} Redirecting you to the payment page…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-lg tracking-tight">pryro</span>
          </div>
          <p className="text-blue-100 text-sm">Send a message to a Pryro user</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

          {/* Recipient pill */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Sending to</p>
              <p className="text-sm font-semibold text-blue-900">{recipientEmail}</p>
            </div>
            <Lock className="w-4 h-4 text-blue-400 ml-auto" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                <input
                  type="text"
                  value={form.externalName}
                  onChange={set('externalName')}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none
                             focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.externalEmail}
                  onChange={set('externalEmail')}
                  placeholder="you@gmail.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none
                             focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={set('subject')}
                placeholder="What's this about?"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none
                           focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.body}
                onChange={set('body')}
                placeholder="Write your message here…"
                rows={8}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none
                           focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                         hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Pryro users control who can reach them. A delivery fee may apply.
          </p>
        </div>
      </div>
    </div>
  )
}
