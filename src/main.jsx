import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { requestPersistentStorage } from './services/backup.js'

requestPersistentStorage()

const PAGE_WIDTH = 430
const PAGE_HEIGHT = 932

// scale the fixed-size page to the window height (shrinking further if the window is too narrow)
function updatePageScale() {
  const scale = Math.min(window.innerHeight / PAGE_HEIGHT, window.innerWidth / PAGE_WIDTH)
  document.documentElement.style.setProperty('--page-scale', String(scale))
}
updatePageScale()
window.addEventListener('resize', updatePageScale)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
