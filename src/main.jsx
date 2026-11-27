import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ReplyPage from './components/ReplyPage'
import InboundPayPage from './components/InboundPayPage'
import InboundSendPage from './components/InboundSendPage'
import './index.css'

const params = new URLSearchParams(window.location.search)

// ?reply=<token>   — edxfternal user paying to reply to an outbound email
const replyToken = params.get('reply')

// ?inbound=<token> — external sender paying the inbound delivery fee
const inboundToken = params.get('inbound')

// ?send=<pryro-email> — external sender composing a new message to a Pryro user
const sendTo = params.get('send')

let root

if (replyToken) {
  root = <ReplyPage token={replyToken} />
} else if (inboundToken) {
  root = <InboundPayPage token={inboundToken} />
} else if (sendTo) {
  root = <InboundSendPage recipientEmail={decodeURIComponent(sendTo)} />
} else {
  root = <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {root}
  </React.StrictMode>,
)
