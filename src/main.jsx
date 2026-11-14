import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './crayon.css' // after styles.css, so the crayon storybook look wins

createRoot(document.getElementById('root')).render(<App />)
