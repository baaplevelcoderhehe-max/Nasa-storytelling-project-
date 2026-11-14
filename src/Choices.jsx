import React, { useState } from 'react'
import { NavButtonFrame } from './ui/theme'

// Choice buttons + optional free-text answer for the current state.
// Choices come from state.choices (already filtered by the app); the input
// comes from state.input. Both hand a { to, set } payload back to the app.
export default function Choices({ state, onChoose }) {
  const [value, setValue] = useState('')
  const choices = state?.choices ?? []
  const input = state?.input
  if (!choices.length && !input) return null

  const frame = (i) => ({
    ...NavButtonFrame({ w: 300, h: 44 }),
    width: '100%',
    animationDelay: `${0.15 + i * 0.1}s`,
  })

  const submit = (e) => {
    e.preventDefault()
    const text = value.trim()
    onChoose({ to: input.to, set: text ? { [input.key]: text } : {} })
  }

  return (
    <div className="choices">
      {choices.map((c, i) => (
        <button
          key={i}
          type="button"
          className="choices__btn"
          style={frame(i)}
          onClick={() => onChoose(c)}
        >
          {c.text}
        </button>
      ))}

      {input && (
        <form className="choices__form" onSubmit={submit}>
          <input
            className="choices__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={input.placeholder}
            maxLength={input.maxLength ?? 160}
            aria-label={input.placeholder ?? 'Your answer'}
            autoComplete="off"
          />
          <button
            type="submit"
            className="choices__btn choices__btn--submit"
            style={{ ...frame(choices.length), width: 'auto', flex: '0 0 auto' }}
          >
            {input.submit ?? 'Send'}
          </button>
        </form>
      )}
    </div>
  )
}
