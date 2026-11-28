import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Send, UserPlus, DollarSign, Bold, Italic, Underline,
  Link as LinkIcon, Image, Paperclip, Smile, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, RotateCcw, RotateCw, Type, Sparkles, FileText, Table, Code,
  Calendar, Clock, MapPin, Phone, Mail as MailIcon, Hash, AtSign, MessageCircle,
  Reply, Forward,
} from 'lucide-react'
import { emailAPI, knoccAPI, userAPI } from '../services/api'

// Common emoji set for the picker
const EMOJIS = [
  '😀','😂','😊','😍','🤔','😎','👍','👎','❤️','🎉',
  '🙏','💪','✅','❌','⭐','🔥','💡','📧','📎','🗓️',
  '👋','🤝','💼','📊','✏️','🚀','💬','🔔','⚠️','ℹ️',
]

function ComposeModal({ onClose, onSendKnoccRequest, replyTo, forwardOf, draft, inline }) {
  // ── Fields ────────────────────────────────────────────────────────────────
  const [recipients, setRecipients] = useState([]) // [{email, name, approved, knoccPrice}]
  const [recipientInput, setRecipientInput] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  // ── Contacts / autocomplete ───────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCcSuggestions, setShowCcSuggestions] = useState(false)
  const [showBccSuggestions, setShowBccSuggestions] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [allContacts, setAllContacts] = useState([])
  const recipientInputRef = useRef(null)

  // ── Knocc ─────────────────────────────────────────────────────────────────
  const [showKnoccPayment, setShowKnoccPayment] = useState(false)
  const [knoccReason, setKnoccReason] = useState('')

  // ── Pay-to-reply (external recipients) ───────────────────────────────────
  const [payToReplyEnabled, setPayToReplyEnabled] = useState(false)
  const [replyFee, setReplyFee] = useState('1.00')

  // ── Status ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftId, setDraftId] = useState(null)
  const [draftSaved, setDraftSaved] = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedFont, setSelectedFont] = useState('Sans Serif')
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // ── Attachments ───────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState([]) // [{filename, mimeType, size, data(b64), preview}]

  // ── AI / Templates / WhatsApp modals ─────────────────────────────────────
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiTone, setAiTone] = useState('professional')
  const [aiCategory, setAiCategory] = useState('general')
  const [aiPrompt, setAiPrompt] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateTab, setTemplateTab] = useState('content')
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState('')

  const messageRef = useRef(null)
  const fileInputRef = useRef(null)
  const autoSaveTimer = useRef(null)

  // ── Pre-populate from a saved draft ──────────────────────────────────────
  useEffect(() => {
    if (!draft) return

    // Restore the draft ID so saves update rather than create new
    setDraftId(draft.id)

    // Restore To/CC/BCC from recipient rows
    const toList = draft.recipients?.filter((r) => r.type === 'TO').map((r) => ({
      email: r.recipient?.email || '',
      name: r.recipient?.name || r.recipient?.email || '',
      approved: r.recipient?.isContact || false,
      knoccPrice: r.recipient?.knoccPrice || 0,
    })).filter(r => r.email)
    const ccList = draft.recipients?.filter((r) => r.type === 'CC').map((r) => r.recipient?.email || '').filter(Boolean)
    const bccList = draft.recipients?.filter((r) => r.type === 'BCC').map((r) => r.recipient?.email || '').filter(Boolean)

    if (toList?.length) setRecipients(toList)
    if (ccList?.length) { setCc(ccList.join(', ')); setShowCc(true) }
    if (bccList?.length) { setBcc(bccList.join(', ')); setShowBcc(true) }

    setSubject(draft.subject || '')

    // Restore body into the contenteditable div
    setTimeout(() => {
      if (messageRef.current) {
        messageRef.current.innerHTML = draft.body || ''
        setMessage(draft.body || '')
      }
    }, 50)

    // Restore attachments (metadata only — data not returned by getDrafts for size)
    if (draft.attachments?.length) {
      setAttachments(draft.attachments.map((a) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        data: null, // already stored server-side; won't re-upload
        _serverSide: true,
      })))
    }
  }, [draft])

  // ── Pre-populate for reply / forward ─────────────────────────────────────
  useEffect(() => {
    if (replyTo) {
      // The person we're replying to is already on Pmail (we received from them),
      // so mark them as approved — no Knocc payment needed.
      const recipientEmail = replyTo.senderEmail || ''
      const recipientName  = replyTo.senderName  || recipientEmail

      if (recipientEmail) {
        setRecipients([{
          email:      recipientEmail,
          name:       recipientName,
          approved:   true,   // they're on Pmail — we received from them
          knoccPrice: 0,
        }])
      }
      setSubject(replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject || ''}`)

      // Strip any existing blockquote chain — only quote the top-level message text
      const stripQuotes = (html) => {
        const div = document.createElement('div')
        div.innerHTML = html || ''
        div.querySelectorAll('blockquote').forEach((el) => el.remove())
        // Also remove the "On ... wrote:" attribution lines left behind
        div.querySelectorAll('p, div').forEach((el) => {
          if (/On .+wrote:/i.test(el.textContent)) el.remove()
        })
        return div.innerHTML.trim()
      }

      const cleanBody = stripQuotes(replyTo.body || '')
      const quoted = `<br/><br/><blockquote style="border-left:3px solid #d1d5db;padding-left:12px;color:#6b7280;margin:0">`
        + `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af">On ${replyTo.date || ''}, ${recipientName} wrote:</p>`
        + cleanBody
        + `</blockquote>`
      setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.innerHTML = quoted
          setMessage(quoted)
        }
      }, 50)
    } else if (forwardOf) {
      setSubject(forwardOf.subject?.startsWith('Fwd:') ? forwardOf.subject : `Fwd: ${forwardOf.subject || ''}`)
      const fwd = `<br/><br/><p style="font-size:12px;color:#6b7280">---------- Forwarded message ----------</p>`
        + `<p style="font-size:12px;color:#6b7280">From: ${forwardOf.senderName || ''} &lt;${forwardOf.senderEmail || ''}&gt;</p>`
        + `<p style="font-size:12px;color:#6b7280">Date: ${forwardOf.date || ''}</p>`
        + `<p style="font-size:12px;color:#6b7280">Subject: ${forwardOf.subject || ''}</p>`
        + `<br/>`
        + (forwardOf.body || '')
      setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.innerHTML = fwd
          setMessage(fwd)
        }
      }, 50)
    }
  }, [replyTo, forwardOf])

  // ── Load contacts on mount + search live as user types ──────────────────
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        // Load the user's approved contacts first (always available)
        const approvedRes = await userAPI.getContacts()
        if (approvedRes.contacts) {
          setAllContacts(approvedRes.contacts.map(u => ({ ...u, approved: true, isContact: true })))
        }
      } catch (err) {
        console.error('Failed to load contacts:', err)
      }
    }
    fetchContacts()
  }, [])

  // Live search as recipient input changes (min 1 char, hits the server)
  useEffect(() => {
    if (!recipientInput || recipientInput.length < 1) return
    const timer = setTimeout(async () => {
      try {
        const res = await userAPI.searchUsers(recipientInput)
        if (res.users) {
          // Merge with existing contacts, de-dupe by id
          setAllContacts(prev => {
            const map = new Map(prev.map(c => [c.id, c]))
            res.users.forEach(u => {
              if (!map.has(u.id)) map.set(u.id, { ...u, approved: u.isContact })
              else map.set(u.id, { ...map.get(u.id), ...u, approved: u.isContact })
            })
            return Array.from(map.values())
          })
        }
      } catch { /* silent */ }
    }, 250)
    return () => clearTimeout(timer)
  }, [recipientInput])

  // ── Auto-save draft every 30 s if there's content ────────────────────────
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (subject || message) handleSaveDraft(true)
    }, 30000)
    return () => clearInterval(autoSaveTimer.current)
  }, [subject, message, recipients, cc, bcc, attachments, draftId])

  // ── Auto-save on close/minimize ──────────────────────────────────────────
  const handleAutoSaveBeforeAction = useCallback(async (callback) => {
    if (subject || message) {
      await handleSaveDraft(true)
    }
    callback()
  }, [subject, message, recipients, cc, bcc, attachments, draftId])

  // ── Filtered suggestions ──────────────────────────────────────────────────
  const filteredContacts = allContacts.filter(
    (c) => recipientInput.length >= 1 && (
      c.name?.toLowerCase().includes(recipientInput.toLowerCase()) ||
      c.email?.toLowerCase().includes(recipientInput.toLowerCase())
    ) && !recipients.some(r => r.email === c.email)
  )
  const filteredCcContacts = allContacts.filter(
    (c) => cc && (
      c.name.toLowerCase().includes(cc.toLowerCase()) ||
      c.email.toLowerCase().includes(cc.toLowerCase())
    )
  )
  const filteredBccContacts = allContacts.filter(
    (c) => bcc && (
      c.name.toLowerCase().includes(bcc.toLowerCase()) ||
      c.email.toLowerCase().includes(bcc.toLowerCase())
    )
  )

  // ── Formatting helpers ────────────────────────────────────────────────────
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value)
    messageRef.current?.focus()
  }
  const handleMessageChange = () => {
    if (messageRef.current) setMessage(messageRef.current.innerHTML)
  }

  // ── Attachment handling ───────────────────────────────────────────────────
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1]
        setAttachments((prev) => [
          ...prev,
          { filename: file.name, mimeType: file.type, size: file.size, data: base64 },
        ])
      }
      reader.readAsDataURL(file)
    })
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  const removeAttachment = (idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx))

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Insert helpers ────────────────────────────────────────────────────────
  const handleInsertLink = () => {
    const url = window.prompt('Enter URL:')
    if (url?.trim()) applyFormat('createLink', url.trim())
  }
  const handleInsertImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url?.trim()) applyFormat('insertImage', url.trim())
  }
  const handleInsertTable = () => {
    const rows = parseInt(window.prompt('Number of rows:', '3') || '3', 10)
    const cols = parseInt(window.prompt('Number of columns:', '3') || '3', 10)
    if (rows > 0 && cols > 0) {
      let html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">'
      for (let i = 0; i < rows; i++) {
        html += '<tr>' + '<td>[Cell]</td>'.repeat(cols) + '</tr>'
      }
      html += '</table><p></p>'
      document.execCommand('insertHTML', false, html)
      messageRef.current?.focus()
    }
  }
  const handleInsertHR = () => { applyFormat('insertHorizontalRule') }
  const handleInsertCodeBlock = () => {
    const code = window.prompt('Enter code:')
    if (code) {
      document.execCommand('insertHTML', false,
        `<pre style="background:#f4f4f4;padding:10px;border-radius:4px;overflow-x:auto"><code>${code}</code></pre><p></p>`)
    }
  }
  const handleInsertEmoji = (emoji) => {
    if (messageRef.current) {
      messageRef.current.focus()
      document.execCommand('insertText', false, emoji)
      handleMessageChange()
    }
    setShowEmojiPicker(false)
  }

  // ── Draft save ────────────────────────────────────────────────────────────
  const handleSaveDraft = async (silent = false) => {
    if (!subject && !message) return
    try {
      // Skip server-side attachments (already stored) to avoid re-uploading large base64 blobs
      const uploadableAttachments = attachments.filter((a) => a.data && !a._serverSide)
      const payload = {
        ...(draftId && { id: draftId }),
        to: recipients.map(r => r.email),
        cc: cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : [],
        bcc: bcc ? bcc.split(',').map((e) => e.trim()).filter(Boolean) : [],
        subject,
        body: message,
        attachments: uploadableAttachments,
      }
      const res = draftId
        ? await emailAPI.updateDraft(payload)
        : await emailAPI.saveDraft(payload)

      if (res.draft?.id && !draftId) setDraftId(res.draft.id)
      if (!silent) {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    } catch (err) {
      if (!silent) setError('Failed to save draft')
    }
  }

  // ── Recipient change handlers ─────────────────────────────────────────────
  const handleRecipientInputChange = (e) => {
    const value = e.target.value
    setRecipientInput(value)
    setShowSuggestions(value.length >= 1)
  }
  
  const handleAddRecipient = (contact) => {
    setRecipients(prev => [...prev, {
      email: contact.email,
      name: contact.name,
      approved: contact.approved || contact.isContact,
      knoccPrice: contact.knoccPrice || 0,
    }])
    setRecipientInput('')
    setShowSuggestions(false)
    setTimeout(() => recipientInputRef.current?.focus(), 0)
  }
  
  const handleRemoveRecipient = (email) => {
    setRecipients(prev => prev.filter(r => r.email !== email))
  }
  
  const handleRecipientKeyDown = (e) => {
    if (e.key === 'Enter' && recipientInput.trim()) {
      e.preventDefault()
      // Try to match an existing contact
      const match = allContacts.find(c => 
        c.email.toLowerCase() === recipientInput.toLowerCase().trim()
      )
      if (match) {
        handleAddRecipient(match)
      } else {
        // Add as new email (not on platform)
        setRecipients(prev => [...prev, {
          email: recipientInput.trim(),
          name: recipientInput.trim(),
          approved: false,
          knoccPrice: 0,
        }])
        setRecipientInput('')
      }
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      // Remove last recipient on backspace
      setRecipients(prev => prev.slice(0, -1))
    }
  }
  
  const handleSelectContact = (contact) => handleAddRecipient(contact)
  const handleCcChange = (e) => { setCc(e.target.value); setShowCcSuggestions(e.target.value.length > 0) }
  const handleSelectCcContact = (contact) => {
    setCc((prev) => (prev && !prev.endsWith(', ') ? prev + ', ' + contact.email : prev + contact.email))
    setShowCcSuggestions(false)
  }
  const handleBccChange = (e) => { setBcc(e.target.value); setShowBccSuggestions(e.target.value.length > 0) }
  const handleSelectBccContact = (contact) => {
    setBcc((prev) => (prev && !prev.endsWith(', ') ? prev + ', ' + contact.email : prev + contact.email))
    setShowBccSuggestions(false)
  }

  // ── Bake form field values into the DOM before serializing ───────────────
  // ── Bake form field values into a CLONE of the DOM, then serialize ────────
  // We never mutate the live contenteditable — we clone it first, stamp values
  // on the clone, then read innerHTML from the clone. This avoids any crash from
  // el.textContent or setAttribute side-effects on the live editor tree.
  const bakeFormValues = () => {
    if (!messageRef.current) return message

    // Deep-clone the editor contents so we don't touch the live DOM
    const clone = messageRef.current.cloneNode(true)

    // <input> — stamp value attribute on the clone
    clone.querySelectorAll('input').forEach((el) => {
      // Find the matching live input by position to get its current .value
      const allInputs = Array.from(messageRef.current.querySelectorAll('input'))
      const allCloneInputs = Array.from(clone.querySelectorAll('input'))
      const idx = allCloneInputs.indexOf(el)
      const liveValue = allInputs[idx]?.value ?? ''
      el.setAttribute('value', liveValue)
      if (liveValue) el.style.color = '#111827'
    })

    // <textarea> — use innerHTML (not textContent) to avoid wiping siblings
    clone.querySelectorAll('textarea').forEach((el) => {
      const allTA = Array.from(messageRef.current.querySelectorAll('textarea'))
      const allCloneTA = Array.from(clone.querySelectorAll('textarea'))
      const idx = allCloneTA.indexOf(el)
      const liveValue = allTA[idx]?.value ?? ''
      // Escape HTML special chars so the value is safe inside innerHTML
      const escaped = liveValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      el.innerHTML = escaped
      if (liveValue) el.style.color = '#111827'
    })

    const baked = clone.innerHTML
    setMessage(baked)
    return baked
  }

  // ── Validate recipient before send ───────────────────────────────────────
  const validateAndSend = () => {
    // Bake form field values into HTML first — returns the live body to use directly
    const bodyHTML = bakeFormValues()

    // Auto-commit any text still sitting in the input field
    let finalRecipients = [...recipients]
    if (recipientInput.trim()) {
      const typed = recipientInput.trim()
      const match = allContacts.find(c => c.email.toLowerCase() === typed.toLowerCase())
      const newR = match
        ? { email: match.email, name: match.name, approved: match.approved || match.isContact, knoccPrice: match.knoccPrice || 0 }
        : { email: typed, name: typed, approved: false, knoccPrice: 0 }
      finalRecipients = [...finalRecipients, newR]
      setRecipients(finalRecipients)
      setRecipientInput('')
    }

    if (finalRecipients.length === 0) { setError('Please enter at least one recipient'); return }
    if (!subject.trim()) { setError('Please enter a subject'); return }
    if (!bodyHTML?.trim()) { setError('Please enter a message'); return }

    // Check if any recipient requires Knocc payment
    // Knocc only applies to REGISTERED Pryro users who aren't an approved contact
    // (they have an `id` from search/contacts). Hand-typed external addresses
    // (Gmail etc.) have no id — they're sent via SMTP and must NEVER trigger Knocc.
    const unapprovedRecipients = finalRecipients.filter(r => r.id && !r.approved)
    if (unapprovedRecipients.length > 0) {
      setSelectedContact(unapprovedRecipients[0])
      setShowKnoccPayment(true)
      return
    }
    handleSend(finalRecipients, bodyHTML)
  }

  // ── Send email ────────────────────────────────────────────────────────────
  const handleSend = async (overrideRecipients, overrideBody) => {
    setLoading(true)
    setError('')
    try {
      const toList = (overrideRecipients || recipients).map(r => r.email)
      const bodyToSend = overrideBody ?? message
      const emailData = {
        to: toList,
        cc: cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : [],
        bcc: bcc ? bcc.split(',').map((e) => e.trim()).filter(Boolean) : [],
        subject,
        body: bodyToSend,
        attachments,
        payToReplyEnabled,
        replyFee: parseFloat(replyFee) || 0,
      }
      const res = await emailAPI.sendEmail(emailData)

      // Delete draft if we were editing one
      if (draftId) {
        try { await emailAPI.deleteDraft(draftId) } catch (_) {}
      }

      onClose()
    } catch (err) {
      setError(err.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  // ── Knocc payment ─────────────────────────────────────────────────────────
  const handleKnoccPayment = async () => {
    if (!knoccReason.trim()) { setError('Please provide a reason for your Knocc request'); return }
    setLoading(true)
    setError('')
    try {
      await knoccAPI.sendRequest({
        recipientEmail: selectedContact.email,
        reason: knoccReason,
        message,
        paymentAmount: selectedContact.knoccPrice,
      })
      setShowKnoccPayment(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to send Knocc request')
    } finally {
      setLoading(false)
    }
  }

  // ── AI generation ─────────────────────────────────────────────────────────
  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) { setError('Please describe what you want to write about'); return }
    const templates = {
      marketing: {
        professional: `<p>Dear Valued Customer,</p><p>We are pleased to introduce ${aiPrompt}. Our team has worked diligently to ensure this meets your expectations and delivers exceptional value.</p><p>We invite you to explore the benefits and features that make this offering unique. Should you have any questions, our dedicated team is ready to assist you.</p><p>Best regards,<br>Your Company</p>`,
        casual: `<p>Hi there! 👋</p><p>We're super excited to share ${aiPrompt} with you!</p><p>Check it out and let us know what you think.</p><p>Cheers,<br>The Team</p>`,
        direct: `<p>Hello,</p><p>${aiPrompt}</p><ul><li>Immediate value</li><li>Easy to implement</li><li>Proven results</li></ul><p>Let's discuss. Thanks,<br>Your Name</p>`,
      },
      professional: {
        professional: `<p>Dear Colleague,</p><p>I am writing to discuss ${aiPrompt}. I believe a collaborative approach would be most beneficial.</p><p>I would appreciate the opportunity to discuss this further at your earliest convenience.</p><p>Sincerely,<br>Your Name</p>`,
        casual: `<p>Hey,</p><p>Hope you're doing well! I wanted to reach out about ${aiPrompt}.</p><p>Let me know when you have a few minutes!</p><p>Thanks,<br>Your Name</p>`,
        direct: `<p>Hi,</p><p>${aiPrompt}</p><p>Action needed: [specify]<br>Timeline: [specify]<br>Next steps: [list]</p><p>Best,<br>Your Name</p>`,
      },
      sales: {
        professional: `<p>Dear [Prospect],</p><p>I wanted to reach out regarding ${aiPrompt} that could significantly benefit your business.</p><p>Would you be available for a brief call this week?</p><p>Best regards,<br>Your Name</p>`,
        casual: `<p>Hi [Name],</p><p>I thought ${aiPrompt} might be a great fit for what you're doing. Quick 15-min call?</p><p>Let me know!</p>`,
        direct: `<p>[Name],</p><p>${aiPrompt}</p><p>ROI: [Expected return]<br>Timeline: [Implementation time]</p><p>Free demo available. Interested?</p>`,
      },
      general: {
        professional: `<p>Dear [Recipient],</p><p>I hope this email finds you well. I wanted to reach out regarding ${aiPrompt}.</p><p>I believe this warrants further discussion and would appreciate your thoughts.</p><p>Best regards,<br>Your Name</p>`,
        casual: `<p>Hey!</p><p>I wanted to touch base about ${aiPrompt}. Thought you might be interested!</p><p>Let me know what you think.</p><p>Cheers,<br>Your Name</p>`,
        direct: `<p>Hi,</p><p>${aiPrompt}</p><p>Please review and let me know your thoughts.</p><p>Thanks,<br>Your Name</p>`,
      },
    }
    const generated = templates[aiCategory]?.[aiTone] || templates.general.professional
    if (messageRef.current) { messageRef.current.innerHTML = generated; setMessage(generated) }
    setShowAIModal(false)
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const htmlToPlainText = (html) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    let text = temp.innerHTML
    text = text.replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, '*$2*')
    text = text.replace(/<(em|i)>(.*?)<\/(em|i)>/gi, '_$2_')
    text = text.replace(/<br\s*\/?>/gi, '\n')
    text = text.replace(/<\/p>/gi, '\n\n').replace(/<p[^>]*>/gi, '')
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    text = text.replace(/<\/?[ou]l[^>]*>/gi, '\n')
    text = text.replace(/<[^>]+>/g, '')
    temp.innerHTML = text
    return (temp.textContent || temp.innerText || '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const handleWhatsAppSend = () => {
    if (!whatsappPhone.trim()) { setError('Please enter a phone number'); return }
    const clean = whatsappPhone.replace(/[^\d+]/g, '').replace(/^\+/, '')
    if (!clean) { setError('Please enter a valid phone number'); return }
    const text = (subject ? `*${subject}*\n\n` : '') + htmlToPlainText(message)
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank')
    setShowWhatsAppModal(false)
    setWhatsappPhone('')
  }

  // ── Email templates ───────────────────────────────────────────────────────
  const emailTemplates = [
    { id: 'meeting-request', name: 'Meeting Request', icon: Calendar, category: 'email',
      template: `<p>Hi [Name],</p><p>I would like to schedule a meeting to discuss [topic].</p><p><strong>Date:</strong> [Date]<br><strong>Time:</strong> [Time]<br><strong>Location:</strong> [Location]</p><p>Best regards,<br>[Your Name]</p>` },
    { id: 'follow-up', name: 'Follow-up', icon: Clock, category: 'email',
      template: `<p>Hi [Name],</p><p>I wanted to follow up on my previous email regarding [subject]. Just checking in to see if you had a chance to review it.</p><p>Best regards,<br>[Your Name]</p>` },
    { id: 'thank-you', name: 'Thank You', icon: MailIcon, category: 'email',
      template: `<p>Dear [Name],</p><p>Thank you for [reason]. I truly appreciate your [time/support].</p><p>Warm regards,<br>[Your Name]</p>` },
    { id: 'introduction', name: 'Introduction', icon: UserPlus, category: 'email',
      template: `<p>Hi [Name],</p><p>My name is [Your Name] and I'm [position] at [company]. I came across [how] and wanted to reach out.</p><p>Would you be open to a brief conversation?</p><p>Best,<br>[Your Name]</p>` },
    { id: 'project-update', name: 'Project Update', icon: FileText, category: 'email',
      template: `<p>Hi Team,</p><p>Here's a quick update on [project name]:</p><p><strong>Completed:</strong></p><ul><li>[Task 1]</li></ul><p><strong>In Progress:</strong></p><ul><li>[Task 2]</li></ul><p><strong>Next Steps:</strong> [Next steps]</p><p>Best,<br>[Your Name]</p>` },
    { id: 'contact-form', name: 'Contact Form', icon: Table, category: 'form',
      fields: [
        { label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
        { label: 'Email Address', type: 'email', placeholder: 'Enter your email' },
        { label: 'Message', type: 'textarea', placeholder: 'Write your message here...' },
      ] },
    { id: 'feedback-form', name: 'Feedback Form', icon: MessageCircle, category: 'form',
      fields: [
        { label: 'Name', type: 'text', placeholder: 'Your name' },
        { label: 'Email', type: 'email', placeholder: 'Your email' },
        { label: 'Rating', type: 'radio', options: ['⭐ Poor', '⭐⭐ Fair', '⭐⭐⭐ Good', '⭐⭐⭐⭐ Very Good', '⭐⭐⭐⭐⭐ Excellent'] },
        { label: 'Comments', type: 'textarea', placeholder: 'Tell us your thoughts...' },
      ] },
  ]

  const buildFormHTML = (template) => {
    const inputStyle = `style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;background:#fff;color:#374151;"`
    const labelStyle = `style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:2px;"`
    const wrapStyle  = `style="margin-bottom:14px;"`
    let html = `<div style="font-family:sans-serif;max-width:520px;padding:20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">`
    html += `<p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px 0;">${template.name}</p>`
    template.fields.forEach((field) => {
      html += `<div ${wrapStyle}><label ${labelStyle}>${field.label}</label>`
      if (field.type === 'textarea') {
        // Use visible placeholder text as content, styled gray — works inside contenteditable
        html += `<textarea ${inputStyle} rows="3" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;background:#fff;color:#9ca3af;">${field.placeholder}</textarea>`
      } else if (field.type === 'select') {
        html += `<select ${inputStyle}>${field.options.map((o) => `<option>${o}</option>`).join('')}</select>`
      } else if (field.type === 'radio') {
        html += `<div style="margin-top:6px;">${field.options.map((o) => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;margin-bottom:4px;"><input type="radio" name="${field.label.replace(/\s/g,'_')}" style="accent-color:#2563eb"> ${o}</label>`).join('')}</div>`
      } else {
        // Render placeholder as value with gray color — visible in the composer preview
        html += `<input type="${field.type}" value="${field.placeholder || ''}" ${inputStyle} style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;background:#fff;color:#9ca3af;">`
      }
      html += `</div>`
    })
    // No Submit button — the email Send button in the toolbar handles submission
    html += `</div>`
    return html
  }

  const handleInsertTemplate = (template) => {
    const html = template.category === 'form' ? buildFormHTML(template) : template.template
    if (messageRef.current) { messageRef.current.innerHTML = html; setMessage(html) }
    setShowTemplateModal(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (inline) {
    return (
      <>
        <div className="flex flex-col bg-white border-t border-gray-200" style={{ maxHeight: '70vh' }}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 truncate flex items-center gap-2">
              {replyTo ? <><Reply className="w-4 h-4 text-blue-500" /> Reply</> :
               forwardOf ? <><Forward className="w-4 h-4 text-blue-500" /> Forward</> :
               (recipients.length > 0 ? `To: ${recipients.map(r => r.name || r.email).join(', ')}` : 'New Message')}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {error && <div className="mx-4 mt-3 mb-1 text-sm text-red-600">{error}</div>}
              <div className="divide-y divide-gray-200">

                {/* To */}
                <div className="relative px-4 py-2">
                  <div className="flex items-start gap-3">
                    <label className="text-sm text-gray-600 flex-shrink-0 w-10 mt-1.5">To</label>
                    <div className="flex-1 relative">
                      <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
                        {recipients.map((r) => (
                          <div key={r.email} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{backgroundColor:'#2563eb'}}>
                            <span>{r.name || r.email}</span>
                            {!r.approved && r.email.includes('@') && <DollarSign className="w-3 h-3" />}
                            <button onClick={() => handleRemoveRecipient(r.email)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <input ref={recipientInputRef} type="text" value={recipientInput}
                          onChange={handleRecipientInputChange} onKeyDown={handleRecipientKeyDown}
                          onFocus={() => recipientInput && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          placeholder={recipients.length === 0 ? "Type name or email" : "Add more..."}
                          className="flex-1 min-w-[120px] py-0.5 px-0 focus:outline-none text-sm border-none"
                          autoComplete="off" />
                      </div>
                      {showSuggestions && filteredContacts.length > 0 && (
                        <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredContacts.map((contact) => (
                            <button key={contact.id} onMouseDown={() => handleSelectContact(contact)}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                                  {contact.approved && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Approved</span>}
                                </div>
                                <span className="text-xs text-gray-500">{contact.email}</span>
                              </div>
                              {!contact.approved && (
                                <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                  <DollarSign className="w-3 h-3" />${contact.knoccPrice}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 mt-1.5">
                      {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-gray-500 hover:text-blue-600">Cc</button>}
                      {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-gray-500 hover:text-blue-600">Bcc</button>}
                    </div>
                  </div>
                </div>

                {/* Cc */}
                {showCc && (
                  <div className="relative px-4 py-2">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 flex-shrink-0 w-10">Cc</label>
                      <div className="flex-1 relative">
                        <input type="text" value={cc} onChange={handleCcChange}
                          onFocus={() => cc && setShowCcSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowCcSuggestions(false), 150)}
                          className="w-full py-0.5 px-0 focus:outline-none text-sm" autoComplete="off" />
                        {showCcSuggestions && filteredCcContacts.length > 0 && (
                          <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredCcContacts.map((c) => (
                              <button key={c.id} onMouseDown={() => handleSelectCcContact(c)}
                                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center text-left border-b border-gray-100 last:border-b-0 gap-2">
                                <span className="text-sm font-medium text-gray-900">{c.name}</span>
                                <span className="text-xs text-gray-500">{c.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bcc */}
                {showBcc && (
                  <div className="relative px-4 py-2">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 flex-shrink-0 w-10">Bcc</label>
                      <div className="flex-1 relative">
                        <input type="text" value={bcc} onChange={handleBccChange}
                          onFocus={() => bcc && setShowBccSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowBccSuggestions(false), 150)}
                          className="w-full py-0.5 px-0 focus:outline-none text-sm" autoComplete="off" />
                        {showBccSuggestions && filteredBccContacts.length > 0 && (
                          <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredBccContacts.map((c) => (
                              <button key={c.id} onMouseDown={() => handleSelectBccContact(c)}
                                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center text-left border-b border-gray-100 last:border-b-0 gap-2">
                                <span className="text-sm font-medium text-gray-900">{c.name}</span>
                                <span className="text-xs text-gray-500">{c.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 flex-shrink-0 w-10">Subject</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject" className="flex-1 py-0.5 px-0 focus:outline-none text-sm" />
                  </div>
                </div>

                {/* Message */}
                <div className="px-4 py-3">
                  <div ref={messageRef} contentEditable onInput={handleMessageChange}
                    className="w-full min-h-[140px] focus:outline-none text-sm"
                    style={{ fontFamily: selectedFont === 'Sans Serif' ? 'sans-serif' : selectedFont === 'Serif' ? 'serif' : selectedFont === 'Monospace' ? 'monospace' : selectedFont }}
                    suppressContentEditableWarning />
                </div>
              </div>
            </div>

            {/* AI + Template buttons */}
            <div className="bg-white px-4 py-1.5 flex items-center justify-end gap-1.5 border-t border-gray-100">
              <button onClick={() => setShowAIModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium">
                <Sparkles className="w-3 h-3" /> AI Write
              </button>
              <button onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium">
                <FileText className="w-3 h-3" /> Templates
              </button>
            </div>

            {/* Toolbar */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
              <div className="flex items-center gap-1 flex-wrap" onMouseLeave={() => setShowMoreTools(false)}>
                <div className="relative">
                  <button onClick={() => setShowFontMenu(!showFontMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-200 rounded text-sm text-gray-700">
                    {selectedFont}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showFontMenu && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                      {['Sans Serif','Serif','Monospace','Arial','Times New Roman','Courier New'].map((font) => (
                        <button key={font} onClick={() => { setSelectedFont(font); applyFormat('fontName', font === 'Sans Serif' ? 'sans-serif' : font === 'Serif' ? 'serif' : font === 'Monospace' ? 'monospace' : font); setShowFontMenu(false) }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700">{font}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Bold className="w-4 h-4" /></button>
                <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Italic className="w-4 h-4" /></button>
                <button onClick={() => applyFormat('underline')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Underline className="w-4 h-4" /></button>
                <button onMouseEnter={() => setShowMoreTools(true)} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="More tools">
                  <svg className={`w-4 h-4 transition-transform ${showMoreTools ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {showMoreTools && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={() => applyFormat('undo')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => applyFormat('redo')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><RotateCw className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={() => applyFormat('justifyLeft')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => applyFormat('justifyCenter')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => applyFormat('justifyRight')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignRight className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={() => applyFormat('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><List className="w-4 h-4" /></button>
                    <button onClick={() => applyFormat('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><ListOrdered className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={handleInsertTable} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Insert table"><Table className="w-4 h-4" /></button>
                    <button onClick={handleInsertCodeBlock} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Insert code"><Code className="w-4 h-4" /></button>
                    <button onClick={handleInsertHR} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Horizontal line">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={validateAndSend} disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                    <Send className="w-4 h-4" />
                    {loading ? 'Sending…' : 'Send'}
                  </button>
                  <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full text-sm">Discard</button>
                </div>
                <div className="flex items-center gap-1 relative">
                  <input type="file" ref={fileInputRef} onChange={handleFileAttachment} multiple className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="p-2 hover:bg-gray-100 rounded text-gray-600"><Paperclip className="w-5 h-5" /></button>
                  <button onClick={handleInsertLink} title="Insert link" className="p-2 hover:bg-gray-100 rounded text-gray-600"><LinkIcon className="w-5 h-5" /></button>
                  <div className="relative">
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Insert emoji" className="p-2 hover:bg-gray-100 rounded text-gray-600"><Smile className="w-5 h-5" /></button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 z-20">
                        <div className="grid grid-cols-8 gap-1">
                          {EMOJIS.map((emoji) => (
                            <button key={emoji} onClick={() => handleInsertEmoji(emoji)} className="text-xl hover:bg-gray-100 rounded p-0.5 leading-none">{emoji}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={handleInsertImage} title="Insert image URL" className="p-2 hover:bg-gray-100 rounded text-gray-600"><Image className="w-5 h-5" /></button>
                </div>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm max-w-xs">
                      <Paperclip className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{file.filename}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">{formatBytes(file.size)}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-red-500 flex-shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Knocc payment overlay */}
        {showKnoccPayment && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Knocc Request Required</h2>
                <button onClick={() => { setShowKnoccPayment(false); setSelectedContact(null) }} className="p-1 hover:bg-gray-100 rounded-md"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5">
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Sending to:</span>
                    <span className="font-medium text-gray-900">{selectedContact.name || selectedContact.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Knocc fee:</span>
                    <span className="font-semibold text-gray-900">${selectedContact.knoccPrice || 1}</span>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for contact *</label>
                <textarea value={knoccReason} onChange={(e) => setKnoccReason(e.target.value)}
                  placeholder="Explain why you want to connect..." rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none text-sm resize-none mb-4" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowKnoccPayment(false); setSelectedContact(null) }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancel</button>
                  <button onClick={handleKnoccPayment} disabled={loading || !knoccReason.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium">
                    {loading ? 'Sending…' : `Send Knocc ($${selectedContact.knoccPrice || 1})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-[60]" onClick={() => setShowAIModal(false)}>
            <div className="absolute bottom-2 right-6 bg-white rounded-lg w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                  <h3 className="text-base font-semibold text-gray-900">AI Email Assistant</h3>
                </div>
                <button onClick={() => setShowAIModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                    <select value={aiCategory} onChange={(e) => setAiCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="general">General</option><option value="professional">Professional</option><option value="marketing">Marketing</option><option value="sales">Sales</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Tone</label>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="professional">Professional</option><option value="casual">Casual</option><option value="direct">Direct</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">What do you want to write about?</label>
                  <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., a new product launch, meeting request, project update…" rows={6} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAIModal(false)} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 text-xs font-medium">Cancel</button>
                  <button onClick={handleAIGenerate} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Generate Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-start z-[60] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[70vh] flex flex-col mb-2 ml-2">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Templates</h3>
                <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="flex gap-2 px-5 pt-4 pb-2">
                {['content','form'].map((tab) => (
                  <button key={tab} onClick={() => setTemplateTab(tab)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${templateTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {tab === 'content' ? 'Email Templates' : 'Form Templates'}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  {emailTemplates.filter((t) => (templateTab === 'content' ? t.category === 'email' : t.category === 'form')).map((template) => {
                    const Icon = template.icon
                    return (
                      <button key={template.id} onClick={() => handleInsertTemplate(template)}
                        className="flex items-center gap-3 p-4 rounded-xl shadow-md hover:shadow-lg transition-all text-left">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-white" /></div>
                        <span className="text-sm font-medium text-gray-900">{template.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {!isMinimized && <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />}

      <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg flex flex-col shadow-xl ${
        isMinimized ? 'w-72 overflow-hidden' :
        isExpanded ? 'w-full max-w-6xl max-h-[95vh] transition-all duration-500' :
                     'w-full max-w-xl max-h-[95vh] transition-all duration-500'
      }`} style={isMinimized ? { height: '42px' } : {}}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 cursor-pointer select-none"
          onClick={() => isMinimized && setIsMinimized(false)}>
          <h2 className="text-base font-semibold text-gray-800 truncate flex items-center gap-2">
            {replyTo ? <><Reply className="w-4 h-4 text-blue-500" /> Reply</> :
             forwardOf ? <><Forward className="w-4 h-4 text-blue-500" /> Forward</> :
             (recipients.length > 0 ? `To: ${recipients.map(r => r.name || r.email).join(', ')}` : 'New Message')}
          </h2>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Minimize */}
            <button onClick={() => handleAutoSaveBeforeAction(() => setIsMinimized(!isMinimized))} title={isMinimized ? 'Restore' : 'Minimize'}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            {/* Expand */}
            {!isMinimized && (
              <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Default view' : 'Expand'}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isExpanded ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
              </button>
            )}
            {/* Close */}
            <button onClick={() => handleAutoSaveBeforeAction(onClose)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* ── Body (only shown when not minimized) ── */}
        {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {error && (
              <div className="mx-4 mt-4 mb-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="divide-y divide-gray-200">

              {/* To */}
              <div className="relative px-4 py-2">
                <div className="flex items-start gap-3">
                  <label className="text-sm text-gray-600 flex-shrink-0 w-10 mt-1.5">To</label>
                  <div className="flex-1 relative">
                    <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
                      {recipients.map((r) => (
                        <div key={r.email} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{backgroundColor:'#2563eb'}}>
                          <span>{r.name || r.email}</span>
                          {!r.approved && r.email.includes('@') && (
                            <DollarSign className="w-3 h-3" />
                          )}
                          <button onClick={() => handleRemoveRecipient(r.email)} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <input
                        ref={recipientInputRef}
                        type="text"
                        value={recipientInput}
                        onChange={handleRecipientInputChange}
                        onKeyDown={handleRecipientKeyDown}
                        onFocus={() => recipientInput && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder={recipients.length === 0 ? "Type name or email" : "Add more..."}
                        className="flex-1 min-w-[120px] py-0.5 px-0 focus:outline-none text-sm border-none"
                        autoComplete="off"
                      />
                    </div>
                    {showSuggestions && filteredContacts.length > 0 && (
                      <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredContacts.map((contact) => (
                          <button key={contact.id} onMouseDown={() => handleSelectContact(contact)}
                            className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                                {contact.approved && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Approved</span>}
                              </div>
                              <span className="text-xs text-gray-500">{contact.email}</span>
                            </div>
                            {!contact.approved && (
                              <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                <DollarSign className="w-3 h-3" />${contact.knoccPrice}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 mt-1.5">
                    {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-gray-500 hover:text-blue-600">Cc</button>}
                    {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-gray-500 hover:text-blue-600">Bcc</button>}
                  </div>
                </div>
                {recipients.length > 0 && (
                  <div className="mt-1.5 ml-[52px]">
                    <button 
                      onClick={() => recipientInputRef.current?.focus()}
                      className="text-xs font-medium flex items-center gap-1" style={{color:'#2563eb'}}
                    >
                      <UserPlus className="w-3 h-3" /> Add another recipient
                    </button>
                  </div>
                )}
                {recipients.some(r => !r.approved && r.email.includes('@')) && (
                  <div className="mt-2 flex items-center gap-2 text-sm p-3 rounded-lg text-orange-500">
                    <UserPlus className="w-4 h-4 flex-shrink-0" />
                    <span>Some recipients require Knocc requests. Click Send to proceed.</span>
                  </div>
                )}
              </div>

              {/* Cc */}
              {showCc && (
                <div className="relative px-4 py-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 flex-shrink-0 w-10">Cc</label>
                    <div className="flex-1 relative">
                      <input type="text" value={cc} onChange={handleCcChange}
                        onFocus={() => cc && setShowCcSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCcSuggestions(false), 150)}
                        className="w-full py-0.5 px-0 focus:outline-none text-sm" autoComplete="off" />
                      {showCcSuggestions && filteredCcContacts.length > 0 && (
                        <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCcContacts.map((c) => (
                            <button key={c.id} onMouseDown={() => handleSelectCcContact(c)}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center text-left border-b border-gray-100 last:border-b-0 gap-2">
                              <span className="text-sm font-medium text-gray-900">{c.name}</span>
                              <span className="text-xs text-gray-500">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bcc */}
              {showBcc && (
                <div className="relative px-4 py-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 flex-shrink-0 w-10">Bcc</label>
                    <div className="flex-1 relative">
                      <input type="text" value={bcc} onChange={handleBccChange}
                        onFocus={() => bcc && setShowBccSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowBccSuggestions(false), 150)}
                        className="w-full py-0.5 px-0 focus:outline-none text-sm" autoComplete="off" />
                      {showBccSuggestions && filteredBccContacts.length > 0 && (
                        <div className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredBccContacts.map((c) => (
                            <button key={c.id} onMouseDown={() => handleSelectBccContact(c)}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center text-left border-b border-gray-100 last:border-b-0 gap-2">
                              <span className="text-sm font-medium text-gray-900">{c.name}</span>
                              <span className="text-xs text-gray-500">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 flex-shrink-0 w-10">Subject</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject" className="flex-1 py-0.5 px-0 focus:outline-none text-sm" />
                </div>
              </div>

              {/* Message */}
              <div className="px-4 py-3">
                <div ref={messageRef} contentEditable onInput={handleMessageChange}
                  className="w-full min-h-[200px] focus:outline-none text-sm"
                  style={{ fontFamily: selectedFont === 'Sans Serif' ? 'sans-serif' : selectedFont === 'Serif' ? 'serif' : selectedFont === 'Monospace' ? 'monospace' : selectedFont }}
                  suppressContentEditableWarning />
              </div>
            </div>
          </div>

          {/* ── AI + Template buttons ── */}
          <div className="bg-white px-4 py-1.5 flex items-center justify-end gap-1.5 border-t border-gray-100">
            <button onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium">
              <Sparkles className="w-3 h-3" /> AI Write
            </button>
            <button onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium">
              <FileText className="w-3 h-3" /> Templates
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center gap-1 flex-wrap" onMouseLeave={() => setShowMoreTools(false)}>
              {/* Font picker */}
              <div className="relative">
                <button onClick={() => setShowFontMenu(!showFontMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-200 rounded text-sm text-gray-700">
                  {selectedFont}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFontMenu && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                    {['Sans Serif','Serif','Monospace','Arial','Times New Roman','Courier New'].map((font) => (
                      <button key={font} onClick={() => {
                        setSelectedFont(font)
                        applyFormat('fontName', font === 'Sans Serif' ? 'sans-serif' : font === 'Serif' ? 'serif' : font === 'Monospace' ? 'monospace' : font)
                        setShowFontMenu(false)
                      }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700">{font}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Bold className="w-4 h-4" /></button>
              <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Italic className="w-4 h-4" /></button>
              <button onClick={() => applyFormat('underline')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><Underline className="w-4 h-4" /></button>
              {/* More tools toggle */}
              <button onMouseEnter={() => setShowMoreTools(true)} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="More tools">
                <svg className={`w-4 h-4 transition-transform ${showMoreTools ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showMoreTools && (
                <>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button onClick={() => applyFormat('undo')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><RotateCcw className="w-4 h-4" /></button>
                  <button onClick={() => applyFormat('redo')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><RotateCw className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button onClick={() => applyFormat('justifyLeft')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => applyFormat('justifyCenter')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => applyFormat('justifyRight')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><AlignRight className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button onClick={() => applyFormat('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><List className="w-4 h-4" /></button>
                  <button onClick={() => applyFormat('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-600"><ListOrdered className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button onClick={handleInsertTable} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Insert table"><Table className="w-4 h-4" /></button>
                  <button onClick={handleInsertCodeBlock} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Insert code"><Code className="w-4 h-4" /></button>
                  <button onClick={handleInsertHR} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Horizontal line">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button onClick={() => setShowWhatsAppModal(true)} disabled={!subject || !message}
                    className="p-2 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50" title="Send via WhatsApp">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Footer: send + attachments + insert ── */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={validateAndSend}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending…' : 'Send'}
                </button>
                <button onClick={() => handleAutoSaveBeforeAction(onClose)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full text-sm">Cancel</button>
              </div>
              <div className="flex items-center gap-1 relative">
                <input type="file" ref={fileInputRef} onChange={handleFileAttachment} multiple className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                  className="p-2 hover:bg-gray-100 rounded text-gray-600"><Paperclip className="w-5 h-5" /></button>
                <button onClick={handleInsertLink} title="Insert link"
                  className="p-2 hover:bg-gray-100 rounded text-gray-600"><LinkIcon className="w-5 h-5" /></button>
                {/* Emoji picker */}
                <div className="relative">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Insert emoji"
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"><Smile className="w-5 h-5" /></button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 z-20">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => handleInsertEmoji(emoji)}
                            className="text-xl hover:bg-gray-100 rounded p-0.5 leading-none">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={handleInsertImage} title="Insert image URL"
                  className="p-2 hover:bg-gray-100 rounded text-gray-600"><Image className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Pay-to-reply toggle for external recipients */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payToReplyEnabled}
                  onChange={(e) => setPayToReplyEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  Require payment to reply
                </span>
              </label>
              {payToReplyEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">Reply fee:</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={replyFee}
                      onChange={(e) => setReplyFee(e.target.value)}
                      className="w-20 pl-6 pr-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
              {payToReplyEnabled && (
                <span className="text-xs text-gray-400">
                  External recipients pay this fee to reply — you receive it in your wallet.
                </span>
              )}
            </div>

            {/* Attached files */}
            {attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm max-w-xs">
                    <Paperclip className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{file.filename}</span>
                    <span className="text-gray-400 text-xs flex-shrink-0">{formatBytes(file.size)}</span>
                    <button onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-red-500 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ── Knocc payment overlay ── */}
      {showKnoccPayment && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Knocc Request Required</h2>
              <button onClick={() => { setShowKnoccPayment(false); setSelectedContact(null); }} className="p-1 hover:bg-gray-100 rounded-md">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Sending to:</span>
                  <span className="font-medium text-gray-900">{selectedContact.name || selectedContact.email}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Knocc fee:</span>
                  <span className="font-semibold text-gray-900">${selectedContact.knoccPrice || 1}</span>
                </div>
                {recipients.filter(r => !r.approved && r.email.includes('@')).length > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Note: You have {recipients.filter(r => !r.approved && r.email.includes('@')).length} unapproved recipients. Knocc requests will be sent to each.</p>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for contact *</label>
              <textarea value={knoccReason} onChange={(e) => setKnoccReason(e.target.value)}
                placeholder="Explain why you want to connect..." rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none text-sm resize-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => { setShowKnoccPayment(false); setSelectedContact(null); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button onClick={handleKnoccPayment} disabled={loading || !knoccReason.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium">
                  {loading ? 'Sending…' : `Send Knocc ($${selectedContact.knoccPrice || 1})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Modal ── */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-[60]" onClick={() => setShowAIModal(false)}>
          <div className="absolute bottom-2 right-6 bg-white rounded-lg w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">AI Email Assistant</h3>
              </div>
              <button onClick={() => setShowAIModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                  <select value={aiCategory} onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="general">General</option>
                    <option value="professional">Professional</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tone</label>
                  <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">What do you want to write about?</label>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., a new product launch, meeting request, project update…"
                  rows={6} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAIModal(false)}
                  className="px-5 py-2 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 text-xs font-medium">Cancel</button>
                <button onClick={handleAIGenerate}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Generate Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates Modal ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-start z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[70vh] flex flex-col mb-2 ml-2">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Templates</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex gap-2 px-5 pt-4 pb-2">
              {['content','form'].map((tab) => (
                <button key={tab} onClick={() => setTemplateTab(tab)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${templateTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {tab === 'content' ? 'Email Templates' : 'Form Templates'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                {emailTemplates.filter((t) => (templateTab === 'content' ? t.category === 'email' : t.category === 'form')).map((template) => {
                  const Icon = template.icon
                  return (
                    <button key={template.id} onClick={() => handleInsertTemplate(template)}
                      className="flex items-center gap-3 p-4 rounded-xl shadow-md hover:shadow-lg transition-all text-left">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{template.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Modal ── */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Send via WhatsApp</h3>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone number (with country code)</label>
              <input type="tel" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={handleWhatsAppSend}
                  className="flex-1 px-4 py-2 bg-[#25D366] text-white rounded-md hover:bg-[#20b858] text-sm font-medium">Open WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ComposeModal
