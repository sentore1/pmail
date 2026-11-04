import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ReplyPage from './components/ReplyPage'
import './index.css'

// If the URL contains ?reply=<token>, render the public reply page for external
// recipients instead of the main authenticated app.
const replyToken = new URLSearchParams(window.location.search).get('reply')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {replyToken ? <ReplyPage token={replyToken} /> : <App />}
  </React.StrictMode>,
)
