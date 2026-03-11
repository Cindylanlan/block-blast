import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import './styles/game.css'
import { initSpeechCombo } from './services/speechCombo'
import App from './App.tsx'

initSpeechCombo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
