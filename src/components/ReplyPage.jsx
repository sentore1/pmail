import React, { useState, useEffect, useRef } from 'react'
import { Lock, Mail, Send, CheckCircle, AlertCircle, ArrowLeft, User } from 'lucide-react'
import { payToReplyAPI } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy'
const stripePromise = STRIPE_PUBLISHABLE_KEY !== 'pk_test_dummy' ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

export default function ReplyPage({ token }) {
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paid, setPaid] = useState(false)
  const cardRef = useRef(null)
  const stripeInstanceRef = useRef(null)
  const cardElementRef = useRef(null)

  // Reply form state
  const [senderName, setSenderName] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetchInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchInvitation = async () => {
    try {
      const data = await payToReplyAPI.getInvitation(token)
      setInvitation(data)
      if (data.status === 'PAID') setPaid(true)
      if (data.status === 'REPLIED') setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  // Initialize Stripe card element when payment is needed
  useEffect(() => {
    if (!invitation || paid || sent || invitation.replyFee <= 0) return
    if (!stripePromise) {
      setPaymentError('Stripe is not configured. Contact the sender for assistance.')
      return
    }

    let active = true

    const initStripe = async () => {
      try {
        const stripe = await stripePromise
        if (!active) return
        stripeInstanceRef.current = stripe

        const elements = stripe.elements({
          appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5' } },
        })
        const card = elements.create('card', {
          style: {
            base: { fontSize: '16px', color: '#1f2937', '::placeholder': { color: '#9ca3af' } },
            invalid: { color: '#ef4444' },
          },
        })

        if (cardRef.current) {
          card.mount(cardRef.current)
          cardElementRef.current = { card, elements }
        }
      } catch (err) {
        setPaymentError('Failed to initialize payment form')
      }
    }

    initStripe()

    return () => {
      active = false
      if (cardElementRef.current?.card) {
        cardElementRef.current.card.destroy()
        cardElementRef.current = null
      }
    }
  }, [invitation, paid, sent])

  // ── Handle payment ──
  const handlePayment = async () => {
    setPaymentLoading(true)
    setPaymentError('')

    try {
      // 1. Create PaymentIntent on the server
      const { clientSecret, paymentIntentId, replyFee, platformFee } =
        await payToReplyAPI.createPayment(token)

      // 2. Confirm card payment via Stripe.js
      const stripe = stripeInstanceRef.current
      if (!stripe || !cardElementRef.current?.card) {
        setPaymentError('Payment form not ready. Please refresh the page.')
        setPaymentLoading(false)
        return
      }

      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElementRef.current.card },
      })

      if (stripeError) {
        setPaymentError(stripeError.message || 'Payment failed')
        setPaymentLoading(false)
        return
      }

      // 3. Confirm on the server — marks invitation PAID + credits sender wallet
      await payToReplyAPI.confirmPayment(token, paymentIntentId)
      setPaid(true)
    } catch (err) {
      setPaymentError(err.message || 'Payment failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  // ── Handle reply submission ──
  const handleReply = async () => {
    if (!senderName.trim()) { setError('Please enter your name'); return }
    if (!replyBody.trim()) { setError('Please enter your reply'); return }

    setSending(true)
    setError('')
    try {
      await payToReplyAPI.submitReply(token, {
        replyBody: `<div>${replyBody.replace(/\n/g, '<br/>')}</div>`,
        senderName: senderName.trim(),
      })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Error state (invalid/expired token) ──
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link Invalid or Expired</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-4">
            If you believe this is an error, please ask the sender to resend the email.
          </p>
        </div>
      </div>
    )
  }

  const feeRequired = invitation.replyFee > 0
  const canReply = paid || !feeRequired

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-lg">Pmail</span>
          </div>
          <p className="text-indigo-100 text-sm">
            You received a message from {invitation.sender.name}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Email info card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-semibold text-sm">
                {invitation.sender.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{invitation.sender.name}</p>
              <p className="text-xs text-gray-400">{invitation.sender.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(invitation.email.sentAt).toLocaleString()}
              </p>
            </div>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{invitation.email.subject}</h1>
        </div>

        {/* Already replied state */}
        {sent ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Reply Sent!</h2>
            <p className="text-sm text-gray-500">
              Your reply has been delivered to {invitation.sender.name}.
            </p>
          </div>
        ) : !canReply ? (
          /* ── Payment required ── */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Payment Required to Reply</h2>
                <p className="text-sm text-gray-500">
                  A fee of <span className="font-semibold text-gray-900">${invitation.replyFee.toFixed(2)}</span> is required to reply to this email.
                </p>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reply fee</span>
                <span className="text-gray-900">${invitation.replyFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Processing fee</span>
                <span className="text-gray-400">Included</span>
              </div>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{paymentError}</p>
              </div>
            )}

            {/* Stripe card element */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
              <div ref={cardRef} className="border border-gray-200 rounded-lg p-3 bg-white" />
            </div>

            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Pay ${invitation.replyFee.toFixed(2)} to Reply
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              Secure payment via Stripe. Your card details are encrypted and never stored.
            </p>
          </div>
        ) : (
          /* ── Reply form (after payment or free) ── */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                {paid ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Send className="w-5 h-5 text-indigo-600" />}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {paid ? 'Payment Confirmed — Write Your Reply' : 'Write Your Reply'}
                </h2>
                <p className="text-sm text-gray-500">
                  {paid
                    ? `You paid $${invitation.replyFee.toFixed(2)}. Your reply will be delivered to ${invitation.sender.name}.`
                    : `Your reply will be delivered to ${invitation.sender.name}.`}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Name input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Reply body */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your reply
              </label>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type your reply here…"
                rows={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>

            <button
              onClick={handleReply}
              disabled={sending || !senderName.trim() || !replyBody.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by Pmail — privacy-focused email with paid replies
        </p>
      </div>
    </div>
  )
}
