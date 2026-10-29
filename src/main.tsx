import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { localTestAccountFor } from './lib/local-test-accounts'

const testAccount = localTestAccountFor(import.meta.env.DEV, window.location)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App testAccount={testAccount ?? undefined} />
  </React.StrictMode>,
)
