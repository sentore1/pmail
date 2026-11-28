import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Clock, Zap, Copy, CheckCircle, ArrowLeft, Smartphone } from 'lucide-react'
import { walletAPI } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy')

// ── Stripe card form (uses Elements — no raw card numbers) ────────────────────
function StripeCardForm({ amount, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements || !amount || parseFloat(amount) < 1) return
    setLoading(true)
    try {
      const { clientSecret } = await walletAPI.createStripePaymentIntent(parseFloat(amount))
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      })
      if (error) throw new Error(error.message)
      if (paymentIntent.status === 'succeeded') {
        const res = await walletAPI.confirmStripePayment(paymentIntent.id)
        onSuccess(res)
      }
    } catch (err) {
      onError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <CardElement options={{ style: { base: { fontSize: '15px', color: '#111827' } } }} />
      </div>
      <button type="submit" disabled={!stripe || loading || !amount || parseFloat(amount) < 1}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-md font-medium flex items-center justify-center gap-2">
        {loading ? <><Clock className="w-4 h-4 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4" /> Pay ${amount || '0.00'} with Card</>}
      </button>
    </form>
  )
}

// ── Main WalletModal ──────────────────────────────────────────────────────────
function WalletModal({ onClose, user }) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeGateway, setActiveGateway] = useState('MOMO') // controlled by admin

  // MoMo state
  const [momoPhone, setMomoPhone] = useState('')
  const [momoReference, setMomoReference] = useState(null)
  const [checkingMomo, setCheckingMomo] = useState(false)

  // Lightning state
  const [lightningInvoice, setLightningInvoice] = useState(null)
  const [invoiceCopied, setInvoiceCopied] = useState(false)
  const [checkingInvoice, setCheckingInvoice] = useState(false)

  // Withdraw state
  const [withdrawMethod, setWithdrawMethod] = useState('bank')
  const [lightningAddress, setLightningAddress] = useState('')

  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => {
    loadWalletData()
    walletAPI.getActiveGateway().then(r => setActiveGateway(r.activeGateway)).catch(() => {})
  }, [])

  // MoMo polling
  useEffect(() => {
    if (!momoReference || !checkingMomo) return
    const interval = setInterval(async () => {
      try {
        const res = await walletAPI.checkMomoPayment(momoReference)
        if (res.status === 'SUCCESSFUL') {
          setSuccess(`Payment successful! ${res.depositAmount?.toLocaleString()} RWF added to your wallet.`)
          setBalance(res.walletBalance)
          setMomoReference(null)
          setCheckingMomo(false)
          await loadWalletData()
          setTimeout(() => { if (mountedRef.current) { setActiveTab('overview'); setSuccess('') } }, 2500)
        } else if (res.status === 'FAILED') {
          setError('MoMo payment failed. Please try again.')
          setMomoReference(null)
          setCheckingMomo(false)
        }
      } catch (err) { console.error('MoMo poll error:', err) }
    }, 4000)
    return () => clearInterval(interval)
  }, [momoReference, checkingMomo])

  // Lightning polling
  useEffect(() => {
    if (!lightningInvoice || !checkingInvoice) return
    const interval = setInterval(async () => {
      try {
        const res = await walletAPI.checkInvoiceStatus(lightningInvoice.paymentHash)
        if (res.settled) {
          setSuccess('Payment received! Your wallet has been credited.')
          setBalance(res.walletBalance)
          setLightningInvoice(null)
          setCheckingInvoice(false)
          await loadWalletData()
          setTimeout(() => { if (mountedRef.current) { setActiveTab('overview'); setSuccess('') } }, 2000)
        }
      } catch (err) { console.error('Lightning poll error:', err) }
    }, 3000)
    return () => clearInterval(interval)
  }, [lightningInvoice, checkingInvoice])

  const loadWalletData = async () => {
    try {
      const [balRes, txRes] = await Promise.all([walletAPI.getBalance(), walletAPI.getTransactions()])
      if (!mountedRef.current) return
      if (balRes.walletBalance !== undefined) setBalance(balRes.walletBalance)
      if (txRes.transactions) setTransactions(txRes.transactions)
    } catch (err) { if (mountedRef.current) setError('Failed to load wallet data') }
  }

  const resetDeposit = () => { setError(''); setSuccess(''); setAmount(''); setLightningInvoice(null); setCheckingInvoice(false) }

  const handleMomoPayment = async () => {
    if (!amount || parseFloat(amount) < 1) return setError('Amount must be at least $1')
    if (!momoPhone.trim()) return setError('Enter your MoMo phone number')
    setLoading(true); setError('')
    try {
      const res = await walletAPI.initiateMomoPayment(parseFloat(amount), momoPhone.trim())
      setMomoReference(res.referenceId)
      setCheckingMomo(true)
      setSuccess(`Request sent to ${momoPhone}. Approve it on your phone.`)
    } catch (err) {
      setError(err.message || 'Failed to initiate MoMo payment')
    } finally { setLoading(false) }
  }

  const handleStripeSuccess = async (res) => {
    setBalance(res.walletBalance)
    setSuccess(`Successfully added ${parseFloat(amount).toLocaleString()} RWF!`)
    setAmount('')
    await loadWalletData()
    setTimeout(() => { if (mountedRef.current) { setActiveTab('overview'); setSuccess('') } }, 3000)
  }

  const handleCreateLightningInvoice = async () => {
    if (!amount || parseFloat(amount) < 1) return setError('Amount must be at least $1')
    setLoading(true); setError('')
    try {
      const res = await walletAPI.createLightningInvoice(parseFloat(amount))
      if (res.invoice) { setLightningInvoice(res.invoice); setCheckingInvoice(true) }
    } catch (err) { setError(err.message || 'Failed to create Lightning invoice') }
    finally { setLoading(false) }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 1) return setError('Amount must be at least $1')
    if (parseFloat(amount) > balance) return setError('Insufficient balance')
    if (withdrawMethod === 'lightning' && !lightningAddress) return setError('Enter a Lightning invoice')
    setLoading(true); setError('')
    try {
      const res = await walletAPI.withdrawFunds(parseFloat(amount), withdrawMethod === 'lightning' ? lightningAddress : null)
      if (res.walletBalance !== undefined) setBalance(res.walletBalance)
      setSuccess('Withdrawal successful!')
      setAmount(''); setLightningAddress('')
      await loadWalletData()
      setTimeout(() => { if (mountedRef.current) { setActiveTab('overview'); setSuccess('') } }, 2000)
    } catch (err) { setError(err.message || 'Failed to withdraw funds') }
    finally { setLoading(false) }
  }

  const formatTxType = (type) => ({
    DEPOSIT: 'Funds Added', DEPOSIT_PENDING: 'Deposit Pending',
    KNOCC_SENT: 'Knocc Sent', KNOCC_RECEIVED: 'Knocc Received',
    REFUND: 'Refund', WITHDRAWAL: 'Withdrawal',
    INBOUND_FEE_RECEIVED: 'Inbound Fee', INBOUND_FEE_REFUNDED: 'Inbound Refund',
  }[type] || type)

  const formatDate = (d) => {
    const date = new Date(d), now = new Date(), diff = now - date, h = Math.floor(diff / 3600000)
    if (h < 24) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    if (h < 48) return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const feeRate = parseFloat(import.meta.env.VITE_TRANSACTION_FEE_PERCENTAGE || 5)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {activeTab !== 'overview' && (
              <button onClick={() => { setActiveTab('overview'); resetDeposit() }}
                className="p-1.5 hover:bg-gray-50 rounded-md">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {activeTab === 'overview' ? 'My Wallet' : activeTab === 'deposit' ? 'Add Funds' : 'Withdraw Funds'}
              </h2>
              <p className="text-xs text-gray-500">
                {activeTab === 'overview' ? 'Manage your Pmail funds' : activeTab === 'deposit' ? `via ${activeGateway}` : 'Transfer funds out'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-50 rounded-md">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="p-5">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white mb-4">
                <p className="text-sm opacity-90 mb-1">Available Balance</p>
                <p className="text-3xl font-semibold mb-4">{balance.toLocaleString()} RWF</p>
                <div className="flex gap-2">
                  <button onClick={() => { setActiveTab('deposit'); resetDeposit() }}
                    className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50">
                    <Plus className="w-4 h-4" /> Add Funds
                  </button>
                  <button onClick={() => { setActiveTab('withdraw'); resetDeposit() }}
                    className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-30">
                    <ArrowUpRight className="w-4 h-4" /> Withdraw
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-xs text-purple-600 font-medium mb-1">Pryro Request</p>
                  <p className="text-lg font-semibold text-purple-700">50,000+ RWF</p>
                  <p className="text-xs text-purple-600 mt-1">Priority access</p>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-green-600 font-medium mb-1">Standard Request</p>
                  <p className="text-lg font-semibold text-green-700">1,000 RWF</p>
                  <p className="text-xs text-green-600 mt-1">Basic access</p>
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.amount > 0 ? 'bg-blue-100' : 'bg-gray-200'}`}>
                          {txn.amount > 0 ? <ArrowDownRight className="w-4 h-4 text-blue-600" /> : <ArrowUpRight className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatTxType(txn.type)}</p>
                          <p className="text-xs text-gray-400">{formatDate(txn.createdAt)}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {txn.amount > 0 ? '+' : ''}{Math.abs(txn.amount).toLocaleString()} RWF
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Deposit ── */}
          {activeTab === 'deposit' && (
            <div className="p-5">
              {success && (
                <div className="mb-4 text-sm font-semibold flex items-center gap-2" style={{color:'#15803d'}}>
                  <CheckCircle className="w-4 h-4" />{success}
                </div>
              )}
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

              {!lightningInvoice ? (
                <>
                  {/* Amount input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (RWF)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">RWF</span>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder="0" min="1" step="1"
                        className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {[1000, 2500, 5000, 10000].map((p) => (
                      <button key={p} onClick={() => setAmount(p.toString())}
                        className="py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{p.toLocaleString()}</button>
                    ))}
                  </div>

                  {/* ── MoMo (active gateway) ── */}
                  {activeGateway === 'MOMO' && (
                    <div className="mb-4 p-4 rounded-lg space-y-3" style={{backgroundColor:'#FFD700'}}>
                      <div className="flex items-center gap-2">
                        <img src="/momo_mtna.png" alt="MTN MoMo" className="h-7 object-contain" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">MoMo Phone Number</label>
                        <input type="tel" value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)}
                          placeholder="e.g. 46733123453 (sandbox test)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm" />
                        <p className="text-xs text-gray-400 mt-1">
                          Sandbox test number: <span className="font-mono font-medium">46733123453</span>
                        </p>
                      </div>
                      {amount && parseFloat(amount) > 0 && (
                        <div className="text-xs text-yellow-900 bg-yellow-400 p-2 rounded">
                          You will be charged: <strong>{(parseFloat(amount) * (1 + feeRate / 100)).toFixed(0)} RWF</strong> (includes {feeRate}% fee)
                        </div>
                      )}
                      <button onClick={handleMomoPayment}
                        disabled={!amount || parseFloat(amount) < 1 || loading || checkingMomo}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-md font-medium flex items-center justify-center gap-2">
                        {loading ? <><Clock className="w-4 h-4 animate-spin" /> Processing...</>
                          : checkingMomo ? <><Clock className="w-4 h-4 animate-spin" /> Waiting for approval...</>
                          : <><Smartphone className="w-4 h-4" /> Pay {amount || '0'} RWF with MoMo</>}
                      </button>
                      {checkingMomo && momoReference && (
                        <button onClick={async () => {
                          try { await walletAPI.approveMomoSandbox(momoReference) } catch {}
                        }}
                          className="w-full mt-2 border-2 border-yellow-700 text-yellow-900 font-bold py-2 rounded-md text-sm hover:bg-yellow-200">
                          ⚡ Sandbox: Simulate Approval
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Stripe (active gateway) ── */}
                  {activeGateway === 'STRIPE' && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-900">Card Payment (Stripe)</h4>
                      </div>
                      <Elements stripe={stripePromise}>
                        <StripeCardForm amount={amount}
                          onSuccess={handleStripeSuccess}
                          onError={(msg) => setError(msg)} />
                      </Elements>
                      <p className="text-xs text-gray-400 text-center mt-2">
                        Secured by Stripe · {feeRate}% processing fee added
                      </p>
                    </div>
                  )}

                  {/* ── Lightning (active gateway) ── */}
                  {activeGateway === 'LIGHTNING' && (
                    <button onClick={handleCreateLightningInvoice}
                      disabled={!amount || parseFloat(amount) < 1 || loading}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-md font-medium flex items-center justify-center gap-2">
                      {loading ? <><Clock className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Lightning Invoice</>}
                    </button>
                  )}
                </>
              ) : (
                /* Lightning invoice display */
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Invoice</h3>
                  <p className="text-sm text-gray-600 mb-4">Pay ${lightningInvoice.amountUsd?.toFixed(2)} ({lightningInvoice.amountSats} sats)</p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                    <p className="text-xs font-mono text-gray-700 break-all">{lightningInvoice.paymentRequest}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(lightningInvoice.paymentRequest); setInvoiceCopied(true); setTimeout(() => setInvoiceCopied(false), 2000) }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto mb-4">
                    {invoiceCopied ? <><CheckCircle className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Invoice</>}
                  </button>
                  {checkingInvoice && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 animate-spin" /> Waiting for payment...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Withdraw ── */}
          {activeTab === 'withdraw' && (
            <div className="p-5">
              {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Available Balance</p>
                <p className="text-2xl font-semibold text-blue-900">{balance.toLocaleString()} RWF</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['bank', 'Bank', CreditCard, '1-3 days'], ['lightning', 'Lightning', Zap, 'Instant']].map(([val, label, Icon, sub]) => (
                    <button key={val} onClick={() => setWithdrawMethod(val)}
                      className={`p-4 border-2 rounded-lg transition-all ${withdrawMethod === val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${withdrawMethod === val ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (RWF)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">RWF</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0" min="1" max={balance} step="1"
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                </div>
              </div>

              {withdrawMethod === 'lightning' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lightning Invoice</label>
                  <input type="text" value={lightningAddress} onChange={(e) => setLightningAddress(e.target.value)}
                    placeholder="lnbc..." className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                </div>
              )}

              <button onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) < 1 || parseFloat(amount) > balance || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-md font-medium flex items-center justify-center gap-2">
                {loading ? <><Clock className="w-4 h-4 animate-spin" /> Processing...</> : <><ArrowUpRight className="w-4 h-4" /> Withdraw {amount || '0'} RWF</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WalletModal
