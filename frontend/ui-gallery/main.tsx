import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ComponentGallery } from './ComponentGallery'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><ComponentGallery /></StrictMode>)
