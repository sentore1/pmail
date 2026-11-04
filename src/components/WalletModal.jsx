import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Clock, Zap, Copy, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react'
import { walletAPI } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy')

function WalletModal({ onClose, user }) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lightningInvoice, setLightningInvoice] = useState(null)
  const [invoiceCopied, setInvoiceCopied] = useState(false)
  const [checkingInvoice, setCheckingInvoice] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState('bank')
  const [lightningAddress, setLightningAddress] = useState('')
  const [stripeProcessing, setStripeProcessing] = useState(false)
  const [feeInfo, setFeeInfo] = useState(null)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  })
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    loadWalletData()
  }, [])

  useEffect(() => {
    let interval
    if (lightningInvoice && checkingInvoice) {
      interval = setInterval(async () => {
        try {
          const response = await walletAPI.checkInvoiceStatus(lightningInvoice.paymentHash)
          if (response.settled) {
            setSuccess('Payment received! Your wallet has been credited.')
            setBalance(response.walletBalance)
            setLightningInvoice(null)
            setCheckingInvoice(false)
            await loadWalletData()
            setTimeout(() => {
              setActiveTab('overview')
              setSuccess('')
            }, 2000)
          }
        } catch (err) {
          console.error('Failed to check invoice status:', err)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [lightningInvoice, checkingInvoice])

  const loadWalletData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions()
      ])
      if (!mountedRef.current) return
      if (balanceRes.walletBalance !== undefined) setBalance(balanceRes.walletBalance)
      if (transactionsRes.transactions) setTransactions(transactionsRes.transactions)
    } catch (err) {
      if (!mountedRef.current) return
      console.error('Failed to load wallet data:', err)
      setError('Failed to load wallet data')
    }
  }

  const handleAddFundsCard = async () => {
    if (!amount || parseFloat(amount) < 1) {
      setError('Amount must be at least $1')
      return
    }

    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
      setError('Please fill in all card details')
      return
    }

    setLoading(true)
    setStripeProcessing(true)
    setError('')
    
    try {
      // Create payment intent
      const paymentData = await walletAPI.createStripePaymentIntent(parseFloat(amount))
      
      // Show fee information
      setFeeInfo({
        amount: paymentData.amount,
        feeAmount: paymentData.feeAmount,
        totalAmount: paymentData.totalAmount,
        feePercentage: paymentData.feePercentage
      })

      // Get Stripe instance
      const stripe = await stripePromise
      
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Parse expiry date
      const [expMonth, expYear] = cardDetails.expiry.split('/').map(s => s.trim())

      // Confirm payment with card details
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: {
              number: cardDetails.cardNumber.replace(/\s/g, ''),
              exp_month: parseInt(expMonth),
              exp_year: parseInt(expYear.length === 2 ? '20' + expYear : expYear),
              cvc: cardDetails.cvc,
            },
            billing_details: {
              name: cardDetails.name,
              email: user.email,
            },
          },
        }
      )

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const response = await walletAPI.confirmStripePayment(paymentIntent.id)
        
        if (response.walletBalance !== undefined) {
          setBalance(response.walletBalance)
        }
        
        setSuccess(`Successfully added $${paymentData.amount.toFixed(2)}! (Fee: $${paymentData.feeAmount.toFixed(2)})`)
        setAmount('')
        setCardDetails({ cardNumber: '', expiry: '', cvc: '', name: '' })
        setFeeInfo(null)
        await loadWalletData()
        
        setTimeout(() => {
          setActiveTab('overview')
          setSuccess('')
        }, 3000)
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
      setStripeProcessing(false)
    }
  }

  const handleCreateLightningInvoice = async () => {
    if (!amount || parseFloat(amount) < 1) {
      setError('Amount must be at least $1')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await walletAPI.createLightningInvoice(parseFloat(amount))
      
      if (response.invoice) {
        setLightningInvoice(response.invoice)
        setCheckingInvoice(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to create Lightning invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyInvoice = () => {
    if (lightningInvoice) {
      navigator.clipboard.writeText(lightningInvoice.paymentRequest)
      setInvoiceCopied(true)
      setTimeout(() => setInvoiceCopied(false), 2000)
    }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 1) {
      setError('Amount must be at least $1')
      return
    }

    if (parseFloat(amount) > balance) {
      setError('Insufficient balance')
      return
    }

    if (withdrawMethod === 'lightning' && !lightningAddress) {
      setError('Please enter a Lightning address or invoice')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await walletAPI.withdrawFunds(
        parseFloat(amount),
        withdrawMethod === 'lightning' ? lightningAddress : null
      )
      
      if (response.walletBalance !== undefined) {
        setBalance(response.walletBalance)
      }
      
      setSuccess('Withdrawal successful!')
      setAmount('')
      setLightningAddress('')
      await loadWalletData()
      setTimeout(() => {
        setActiveTab('overview')
        setSuccess('')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to withdraw funds')
    } finally {
      setLoading(false)
    }
  }

  const formatTransactionType = (type) => {
    switch (type) {
      case 'DEPOSIT': return 'Funds Added'
      case 'KNOCC_SENT': return 'Knocc Request Sent'
      case 'KNOCC_RECEIVED': return 'Knocc Request Received'
      case 'REFUND': return 'Refund'
      case 'WITHDRAWAL': return 'Withdrawal'
      default: return type
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 24) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } else if (hours < 48) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {activeTab !== 'overview' && (
              <button
                onClick={() => {
                  setActiveTab('overview')
                  setError('')
                  setSuccess('')
                  setAmount('')
                  setLightningInvoice(null)
                  setCheckingInvoice(false)
                }}
                className="p-1.5 hover:bg-gray-50 rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {activeTab === 'overview' && 'My Wallet'}
                {activeTab === 'deposit' && 'Add Funds'}
                {activeTab === 'withdraw' && 'Withdraw Funds'}
              </h2>
              <p className="text-xs text-gray-500">
                {activeTab === 'overview' && 'Manage your Pmail funds'}
                {activeTab === 'deposit' && 'Choose your payment method'}
                {activeTab === 'withdraw' && 'Transfer funds out'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-50 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-5">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white mb-4">
                <p className="text-sm opacity-90 mb-1">Available Balance</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-semibold">${balance.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('deposit')
                      setAmount('')
                      setError('')
                      setSuccess('')
                    }}
                    className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('withdraw')
                      setAmount('')
                      setError('')
                      setSuccess('')
                    }}
                    className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-30 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-xs text-purple-600 font-medium mb-1">Pryro Request</p>
                  <p className="text-lg font-semibold text-purple-700">$50+</p>
                  <p className="text-xs text-purple-600 mt-1">Priority access</p>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-green-600 font-medium mb-1">Standard Request</p>
                  <p className="text-lg font-semibold text-green-700">$1</p>
                  <p className="text-xs text-green-600 mt-1">Basic access</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Transactions</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            txn.amount > 0 ? 'bg-blue-100' : 'bg-gray-200'
                          }`}>
                            {txn.amount > 0 ? (
                              <ArrowDownRight className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatTransactionType(txn.type)}</p>
                            <p className="text-xs text-gray-500">{txn.description}</p>
                            <p className="text-xs text-gray-400">{formatDate(txn.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="p-5">
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {!lightningInvoice ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Choose Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-900">Card</p>
                        <p className="text-xs text-gray-500 mt-1">Instant (via Stripe)</p>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('lightning')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          paymentMethod === 'lightning' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Zap className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === 'lightning' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-900">Lightning</p>
                        <p className="text-xs text-gray-500 mt-1">Low fees</p>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="1"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(preset.toString())}
                        className="py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>

                  {/* Card Details Form - Only show for card payment */}
                  {paymentMethod === 'card' && (
                    <div className="mb-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Card Details</h4>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardDetails.cardNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '')
                            const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                            setCardDetails(prev => ({ ...prev, cardNumber: formatted }))
                          }}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardDetails.expiry}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^0-9]/g, '')
                              if (value.length >= 2) {
                                value = value.slice(0, 2) + '/' + value.slice(2, 4)
                              }
                              setCardDetails(prev => ({ ...prev, expiry: value }))
                            }}
                            placeholder="MM/YY"
                            maxLength="5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CVC</label>
                          <input
                            type="text"
                            value={cardDetails.cvc}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                              setCardDetails(prev => ({ ...prev, cvc: value }))
                            }}
                            placeholder="123"
                            maxLength="4"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardDetails.name}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      {feeInfo && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800">
                              <p className="font-medium mb-1">Transaction Fee</p>
                              <div className="space-y-1">
                                <p>Deposit Amount: ${feeInfo.amount.toFixed(2)}</p>
                                <p>Processing Fee ({feeInfo.feePercentage}%): ${feeInfo.feeAmount.toFixed(2)}</p>
                                <p className="font-semibold pt-1 border-t border-blue-300">Total Charge: ${feeInfo.totalAmount.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={paymentMethod === 'card' ? handleAddFundsCard : handleCreateLightningInvoice}
                    disabled={!amount || parseFloat(amount) < 1 || loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-md transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        {stripeProcessing ? 'Processing Payment...' : 'Processing...'}
                      </>
                    ) : paymentMethod === 'card' ? (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Add ${amount || '0.00'} with Card
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate Lightning Invoice
                      </>
                    )}
                  </button>
                  
                  {paymentMethod === 'card' && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Secured by Stripe • A {parseFloat(import.meta.env.VITE_TRANSACTION_FEE_PERCENTAGE || 5)}% processing fee will be added
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Invoice Generated</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Pay ${lightningInvoice.amountUsd.toFixed(2)} ({lightningInvoice.amountSats} sats)
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                    <p className="text-xs font-mono text-gray-700 break-all">{lightningInvoice.paymentRequest}</p>
                  </div>
                  <button
                    onClick={handleCopyInvoice}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto mb-4"
                  >
                    {invoiceCopied ? <><CheckCircle className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Invoice</>}
                  </button>
                  {checkingInvoice && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 animate-spin" />
                      Waiting for payment...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="p-5">
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Available Balance</p>
                <p className="text-2xl font-semibold text-blue-900">${balance.toFixed(2)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWithdrawMethod('bank')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      withdrawMethod === 'bank' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 mx-auto mb-2 ${withdrawMethod === 'bank' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-900">Bank</p>
                    <p className="text-xs text-gray-500 mt-1">1-3 days</p>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('lightning')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      withdrawMethod === 'lightning' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className={`w-6 h-6 mx-auto mb-2 ${withdrawMethod === 'lightning' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-900">Lightning</p>
                    <p className="text-xs text-gray-500 mt-1">Instant</p>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    max={balance}
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                </div>
              </div>

              {withdrawMethod === 'lightning' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lightning Address or Invoice
                  </label>
                  <input
                    type="text"
                    value={lightningAddress}
                    onChange={(e) => setLightningAddress(e.target.value)}
                    placeholder="lnbc..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) < 1 || parseFloat(amount) > balance || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-md transition-colors font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw ${amount || '0.00'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WalletModal
