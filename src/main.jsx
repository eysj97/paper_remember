import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { requestPersistentStorage } from './services/backup.js'

requestPersistentStorage()

const PAGE_WIDTH = 430
const PAGE_HEIGHT = 932

// The screens are laid out on a 430px-wide page.
//   phone (narrow window): the page fills the screen width, and its height stretches to whatever
//                          the screen has left (it changes as the browser's address bar shows/hides)
//   wider window (PC)    : the 430x932 page is shown whole, scaled to the window height
const PHONE_MAX_WIDTH = 600

function updatePageScale() {
  const width = window.innerWidth
  // innerHeight leaves out the on-screen keyboard on iPhone, so typing doesn't squeeze the page
  const height = window.innerHeight
  const phone = width <= PHONE_MAX_WIDTH
  const scale = phone ? width / PAGE_WIDTH : Math.min(height / PAGE_HEIGHT, width / PAGE_WIDTH)
  const root = document.documentElement
  root.style.setProperty('--page-scale', String(scale))
  root.style.setProperty('--page-height', `${phone ? height / scale : PAGE_HEIGHT}px`)
  root.classList.toggle('phone', phone)
}
updatePageScale()
window.addEventListener('resize', updatePageScale)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
