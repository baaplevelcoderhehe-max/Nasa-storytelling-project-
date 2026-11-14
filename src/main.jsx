import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './crayon.css' // after styles.css, so the crayon storybook look wins

// Screenshot mode (?freeze=…, used by scripts/qa-shots.mjs): every bubble is shown at
// once and the passing chapter banner is hidden, so a still shows the whole page.
if (new URLSearchParams(window.location.search).has('freeze')) document.documentElement.dataset.qaFreeze = '1'

createRoot(document.getElementById('root')).render(<App />)
