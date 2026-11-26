/**
 * InboundPayPage.jsx
 *
 * Standalone page shown when an external (non-Pryro) sender is redirected to
 *   /?inbound=<token>
 * after trying to email a Pryro user who has an inbound fee set.
 *
 * States:
 *  loading  → fetching InboundRequest by token
 *  error    → invalid / expired token
 *  PENDING  → show Stripe payment form ("pay $X to deliver your message")
 *  PAID / ACCEPTED / DECLINED → appropriate confirmation screen
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  Mail, Lock, CheckCircle, AlertCircle, ArrowRight, User, Shield,
} from 'lucide-react'
import { inboundAPI } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'

const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy'
const stripePromise =
  STRIPE_PUBLISHABLE_KEY !== 'pk_test_dummy'
    ? loadStripe(STRIPE_PUBLISHABLE_KEY)
    : null

export default function InboundPayPage({ token }) {
  const [request, setRequest]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError]     = useState('')
  const [paid, setPaid]                     = useState(false)

  const cardRef            = useRef(null)
  const stripeInstanceRef  = useRef(null)
  const cardElementRef     = useRef(null)

  // ── Load InboundRequest ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await inboundAPI.getRequest(token)
        setRequest(data)
        if (data.status === 'PAID' || data.status === 'ACCEPTED') setPaid(true)
      } catch (err) {
        setError(err.message || 'This link is invalid or has expired')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // ── Mount Stripe card element ──────────────────────────────────────────────
  useEffect(() => {
    if (!request || paid || request.inboundFee <= 0) return
    if (!stripePromise) {
      setPaymentError('Stripe is not configured. Contact support.')
      return
    }

    let active = true

    const init = async () => {
      try {
        const stripe = await stripePromise
        if (!active) return
        stripeInstanceRef.current = stripe

        const elements = stripe.elements({
          appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb' } },
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
      } catch {
        setPaymentError('Failed to initialise payment form')
      }
    }

    init()
    return () => {
      active = false
      cardElementRef.current?.card?.destroy()
      cardElementRef.current = null
    }
  }, [request, paid])

  // ── Handle payment ─────────────────────────────────────────────────────────
  const handlePay = async () => {
    setPaymentLoading(true)
    setPaymentError('')
    try {
      const { clientSecret, paymentIntentId } = await inboundAPI.createPayment(token)

      const stripe = stripeInstanceRef.current
      if (!stripe || !cardElementRef.current?.card) {
        setPaymentError('Payment form not ready — please refresh.')
        setPaymentLoading(false)
        return
      }

      const { error: stripeErr } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElementRef.current.card },
      })

      if (stripeErr) {
        setPaymentError(stripeErr.message || 'Payment failed')
        setPaymentLoading(false)
        return
      }

      await inboundAPI.confirmPayment(token, paymentIntentId)
      setPaid(true)
    } catch (err) {
      setPaymentError(err.message || 'Payment failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Invalid / expired ──────────────────────────────────────────────────────
  if (error && !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link Invalid or Expired</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-4">
            If you believe this is an error, please try submitting your message again.
          </p>
        </div>
      </div>
    )
  }

  // ── Already DECLINED ───────────────────────────────────────────────────────
  if (request.status === 'DECLINED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Message Not Accepted</h1>
          <p className="text-sm text-gray-500">
            {request.recipient.name} has chosen not to accept your message. Your
            delivery fee has been refunded.
          </p>
        </div>
      </div>
    )
  }

  // ── Already PAID or ACCEPTED ───────────────────────────────────────────────
  if (paid || request.status === 'PAID' || request.status === 'ACCEPTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {request.status === 'ACCEPTED' ? 'Message Accepted!' : 'Payment Confirmed!'}
          </h1>
          <p className="text-sm text-gray-500">
            {request.status === 'ACCEPTED'
              ? `${request.recipient.name} has accepted your message. They can now reply to you on Pryro.`
              : `Your message has been delivered to ${request.recipient.name}'s inbox. They will review it shortly.`}
          </p>
        </div>
      </div>
    )
  }

  // ── Payment required (PENDING) ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-lg tracking-tight">pryro</span>
          </div>
          <p className="text-blue-100 text-sm">Email Delivery</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">To: {request.recipient.name}</p>
              <p className="text-xs text-gray-400">{request.recipient.email}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Your message subject</p>
            <p className="font-medium text-gray-900 text-sm">{request.subject}</p>
          </div>

          {/* How it works */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">How it works</p>
            {[
              ['Pay the delivery fee', `${request.recipient.name} requires a one-time fee to receive your message.`],
              ['Recipient reads & decides', `${request.recipient.name} can then Accept or Decline your message.`],
              ['If accepted', 'The conversation is open — they can reply directly to you on Pryro.'],
            ].map(([title, desc], i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">{title}</p>
                  <p className="text-xs text-blue-700">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Delivery Fee Required</h2>
              <p className="text-sm text-gray-500">
                Pay <span className="font-semibold text-gray-900">${request.inboundFee.toFixed(2)}</span> to
                deliver your message to {request.recipient.name}
              </p>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="text-gray-900 font-medium">${request.inboundFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Processing</span>
              <span className="text-gray-400">Included</span>
            </div>
            <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>${request.inboundFee.toFixed(2)}</span>
            </div>
          </div>

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{paymentError}</p>
            </div>
          )}

          {/* Stripe card element */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
            <div ref={cardRef} className="border border-gray-200 rounded-xl p-3 bg-white" />
          </div>

          <button
            onClick={handlePay}
            disabled={paymentLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700
                       transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {paymentLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Pay ${request.inboundFee.toFixed(2)} &amp; Deliver Message
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-3">
            <Lock className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-400">
              Secure payment via Stripe. Card details are encrypted and never stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
