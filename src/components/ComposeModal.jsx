import React, { useState, useEffect } from 'react'
import { X, Send, UserPlus, DollarSign, Bold, Italic, Underline, Link as LinkIcon, Image, Paperclip, Smile, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, RotateCcw, RotateCw, Type } from 'lucide-react'
import { emailAPI, knoccAPI, userAPI } from '../services/api'

function ComposeModal({ onClose, onSendKnoccRequest }) {
  const [recipient, setRecipient] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCcSuggestions, setShowCcSuggestions] = useState(false)
  const [showBccSuggestions, setShowBccSuggestions] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [showKnoccPayment, setShowKnoccPayment] = useState(false)
  const [knoccReason, setKnoccReason] = useState('')
  const [allContacts, setAllContacts] = useState([])
  const [approvedContacts, setApprovedContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFont, setSelectedFont] = useState('Sans Serif')
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messageRef = React.useRef(null)
  const fileInputRef = React.useRef(null)
  const [attachments, setAttachments] = useState([])

  // Format command handler
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value)
    messageRef.current?.focus()
  }

  // Handle message content change
  const handleMessageChange = () => {
    if (messageRef.current) {
      setMessage(messageRef.current.innerHTML)
    }
  }

  // Handle file attachment
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files)
    setAttachments([...attachments, ...files])
  }

  // Handle insert link
  const handleInsertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      applyFormat('createLink', url)
    }
  }

  // Handle insert emoji
  const handleInsertEmoji = () => {
    const emoji = prompt('Enter emoji:')
    if (emoji && messageRef.current) {
      document.execCommand('insertText', false, emoji)
    }
  }

  // Handle insert image
  const handleInsertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      applyFormat('insertImage', url)
    }
  }

  // Fetch contacts and approved contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const [contactsRes, approvedRes] = await Promise.all([
          userAPI.searchUsers(''),
          userAPI.getContacts()
        ])
        
        if (contactsRes.users) {
          setAllContacts(contactsRes.users.map(u => ({
            ...u,
            approved: u.isContact
          })))
        }
        
        if (approvedRes.contacts) {
          setApprovedContacts(approvedRes.contacts)
        }
      } catch (err) {
        console.error('Failed to load contacts:', err)
      }
    }
    fetchContacts()
  }, [])

  const filteredContacts = allContacts.filter(contact => 
    recipient && (
      contact.name.toLowerCase().includes(recipient.toLowerCase()) ||
      contact.email.toLowerCase().includes(recipient.toLowerCase())
    )
  )

  const filteredCcContacts = allContacts.filter(contact => 
    cc && (
      contact.name.toLowerCase().includes(cc.toLowerCase()) ||
      contact.email.toLowerCase().includes(cc.toLowerCase())
    )
  )

  const filteredBccContacts = allContacts.filter(contact => 
    bcc && (
      contact.name.toLowerCase().includes(bcc.toLowerCase()) ||
      contact.email.toLowerCase().includes(bcc.toLowerCase())
    )
  )

  const handleRecipientChange = (e) => {
    const value = e.target.value
    setRecipient(value)
    setShowSuggestions(value.length > 0)
    setSelectedContact(null)
  }

  const handleCcChange = (e) => {
    const value = e.target.value
    setCc(value)
    setShowCcSuggestions(value.length > 0)
  }

  const handleBccChange = (e) => {
    const value = e.target.value
    setBcc(value)
    setShowBccSuggestions(value.length > 0)
  }

  const handleSelectContact = (contact) => {
    setRecipient(contact.email)
    setSelectedContact(contact)
    setShowSuggestions(false)
  }

  const handleSelectCcContact = (contact) => {
    // Add to existing CC if there's already content
    if (cc && !cc.endsWith(', ')) {
      setCc(cc + ', ' + contact.email)
    } else {
      setCc(cc + contact.email)
    }
    setShowCcSuggestions(false)
  }

  const handleSelectBccContact = (contact) => {
    // Add to existing BCC if there's already content
    if (bcc && !bcc.endsWith(', ')) {
      setBcc(bcc + ', ' + contact.email)
    } else {
      setBcc(bcc + contact.email)
    }
    setShowBccSuggestions(false)
  }

  const handleSend = async () => {
    if (selectedContact && !selectedContact.approved) {
      // Show Knocc payment modal after clicking send
      setShowKnoccPayment(true)
    } else {
      // Send normal email to approved contact
      setLoading(true)
      setError('')
      
      try {
        const emailData = {
          to: [recipient],
          cc: cc ? cc.split(',').map(e => e.trim()).filter(e => e) : [],
          bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(e => e) : [],
          subject,
          body: message
        }
        
        await emailAPI.sendEmail(emailData)
        onClose()
      } catch (err) {
        setError(err.message || 'Failed to send email')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleKnoccPayment = async () => {
    if (!knoccReason.trim()) {
      setError('Please provide a reason for your Knocc request')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // Send Knocc request
      await knoccAPI.sendRequest({
        recipientEmail: selectedContact.email,
        reason: knoccReason,
        message: message,
        paymentAmount: selectedContact.knoccPrice
      })
      
      setShowKnoccPayment(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to send Knocc request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50 p-6 pb-2">
      <div className={`bg-white rounded-lg flex flex-col shadow-xl mb-0 mr-0 transition-all duration-300 ${
        isExpanded ? 'w-full max-w-6xl max-h-[95vh]' : 'w-full max-w-xl max-h-[95vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">New Message</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? "Default view" : "Expand"}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div className="divide-y divide-gray-200">
            {/* To */}
            <div className="relative px-4 py-2">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-shrink-0">To</label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={handleRecipientChange}
                    onFocus={() => recipient && setShowSuggestions(true)}
                    placeholder=""
                    className="w-full py-0.5 px-0 focus:outline-none text-sm"
                    autoComplete="off"
                  />
                  
                  {/* Autocomplete Suggestions */}
                  {showSuggestions && filteredContacts.length > 0 && (
                    <div className="absolute z-10 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredContacts.map((contact, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                              {contact.approved && (
                                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                                  Approved
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{contact.email}</span>
                          </div>
                          {!contact.approved && (
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                              <DollarSign className="w-3 h-3" />
                              ${contact.knoccPrice}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {selectedContact && !selectedContact.approved && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                  <span>
                    This recipient requires a Knocc request (${selectedContact.knoccPrice}). 
                    Complete your email and click send to proceed with payment.
                  </span>
                </div>
              )}
            </div>

            {/* Cc */}
            {showCc && (
              <div className="relative px-4 py-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 flex-shrink-0">Cc</label>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={cc}
                      onChange={handleCcChange}
                      onFocus={() => cc && setShowCcSuggestions(true)}
                      placeholder=""
                      className="w-full py-0.5 px-0 focus:outline-none text-sm"
                      autoComplete="off"
                    />
                    
                    {/* Cc Autocomplete Suggestions */}
                    {showCcSuggestions && filteredCcContacts.length > 0 && (
                      <div className="absolute z-10 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCcContacts.map((contact, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectCcContact(contact)}
                            className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                                {contact.approved && (
                                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                                    Approved
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{contact.email}</span>
                            </div>
                            {!contact.approved && (
                              <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                <DollarSign className="w-3 h-3" />
                                ${contact.knoccPrice}
                              </div>
                            )}
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
                  <label className="text-sm text-gray-600 flex-shrink-0">Bcc</label>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={bcc}
                      onChange={handleBccChange}
                      onFocus={() => bcc && setShowBccSuggestions(true)}
                      placeholder=""
                      className="w-full py-0.5 px-0 focus:outline-none text-sm"
                      autoComplete="off"
                    />
                    
                    {/* Bcc Autocomplete Suggestions */}
                    {showBccSuggestions && filteredBccContacts.length > 0 && (
                      <div className="absolute z-10 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredBccContacts.map((contact, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectBccContact(contact)}
                            className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                                {contact.approved && (
                                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                                    Approved
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{contact.email}</span>
                            </div>
                            {!contact.approved && (
                              <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                <DollarSign className="w-3 h-3" />
                                ${contact.knoccPrice}
                              </div>
                            )}
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
                <label className="text-sm text-gray-600 flex-shrink-0">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder=""
                  className="flex-1 py-0.5 px-0 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Message */}
            <div className="px-4 py-3 flex-1">
              <div
                ref={messageRef}
                contentEditable
                onInput={handleMessageChange}
                className="w-full min-h-[300px] focus:outline-none text-sm"
                style={{ 
                  fontFamily: selectedFont === 'Sans Serif' ? 'sans-serif' : 
                              selectedFont === 'Serif' ? 'serif' : 
                              selectedFont === 'Monospace' ? 'monospace' : 
                              selectedFont
                }}
                suppressContentEditableWarning
              >
              </div>
            </div>
          </div>
          
          {/* Rich Text Editor Toolbar */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Undo/Redo */}
              <button 
                onClick={() => applyFormat('undo')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('redo')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Redo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              {/* Font Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowFontMenu(!showFontMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-200 rounded text-sm text-gray-700"
                >
                  {selectedFont}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showFontMenu && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                    {['Sans Serif', 'Serif', 'Monospace', 'Arial', 'Times New Roman', 'Courier New'].map(font => (
                      <button
                        key={font}
                        onClick={() => {
                          setSelectedFont(font)
                          const fontFamily = font === 'Sans Serif' ? 'sans-serif' : 
                                           font === 'Serif' ? 'serif' : 
                                           font === 'Monospace' ? 'monospace' : font
                          applyFormat('fontName', fontFamily)
                          setShowFontMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Font Size */}
              <button 
                onClick={() => applyFormat('fontSize', '3')}
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-200 rounded text-gray-600" 
                title="Font size"
              >
                <Type className="w-4 h-4" />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              {/* Text Formatting */}
              <button 
                onClick={() => applyFormat('bold')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('italic')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('underline')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
              
              {/* Text Color */}
              <button 
                onClick={() => applyFormat('foreColor', '#000000')}
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-200 rounded text-gray-600" 
                title="Text color"
              >
                <span className="text-lg font-bold">A</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              {/* Alignment */}
              <button 
                onClick={() => applyFormat('justifyLeft')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Align left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('justifyCenter')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Align center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('justifyRight')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Align right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              {/* Lists */}
              <button 
                onClick={() => applyFormat('insertUnorderedList')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Bulleted list"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => applyFormat('insertOrderedList')}
                className="p-2 hover:bg-gray-200 rounded text-gray-600" 
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              {/* More options */}
              <button className="p-2 hover:bg-gray-200 rounded text-gray-600" title="More options">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer with attachments */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={!recipient || !subject || !message || loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                Cancel
              </button>
            </div>
            
            {/* Attachment buttons */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileAttachment}
                multiple
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded text-gray-600" 
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                onClick={handleInsertLink}
                className="p-2 hover:bg-gray-100 rounded text-gray-600" 
                title="Insert link"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={handleInsertEmoji}
                className="p-2 hover:bg-gray-100 rounded text-gray-600" 
                title="Insert emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button 
                onClick={handleInsertImage}
                className="p-2 hover:bg-gray-100 rounded text-gray-600" 
                title="Insert image"
              >
                <Image className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded text-gray-600" title="More options">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Show attached files */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
                    <Paperclip className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-700">{file.name}</span>
                    <button
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Knocc Payment Modal */}
      {showKnoccPayment && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Knocc Request</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Recipient:</span>
                <span className="text-sm font-medium text-gray-900">{selectedContact.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Knocc Price:</span>
                <span className="text-sm font-semibold text-gray-900">${selectedContact.knoccPrice}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Knocc Request
              </label>
              <textarea
                value={knoccReason}
                onChange={(e) => setKnoccReason(e.target.value)}
                placeholder="Explain why you want to connect..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKnoccPayment(false)}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleKnoccPayment}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
              >
                <DollarSign className="w-4 h-4" />
                {loading ? 'Processing...' : 'Pay & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComposeModal
