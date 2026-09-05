import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import StudyHub from './StudyHub'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudyHub />
  </StrictMode>,
)
