import React from 'react'
import Panel from './Panel'
import { useBook } from '../store'
import { speechAvailable } from './readAloud'

function Choice({ label, value, options, onChange }) {
  return (
    <fieldset className="setting">
      <legend className="setting__label">{label}</legend>
      <div className="setting__options" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={`setting__option${value === v ? ' is-on' : ''}`}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function Settings({ onClose }) {
  const settings = useBook((s) => s.settings)
  const update = useBook((s) => s.updateSettings)
  const onOff = [
    [true, 'On'],
    [false, 'Off'],
  ]
  return (
    <Panel title="Settings" onClose={onClose}>
      <div className="settings">
        <Choice label="Sound" value={settings.sound} options={onOff} onChange={(v) => update({ sound: v })} />
        <div className="setting">
          <label className="setting__label" htmlFor="music-volume">
            Music volume
          </label>
          <input
            id="music-volume"
            className="setting__range"
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.musicVolume}
            onChange={(e) => update({ musicVolume: Number(e.target.value) })}
            aria-valuetext={`${settings.musicVolume}%`}
          />
        </div>
        <Choice
          label="Calm motion"
          value={settings.motion}
          options={[
            ['device', 'Like my device'],
            ['reduce', 'On'],
            ['full', 'Off'],
          ]}
          onChange={(v) => update({ motion: v })}
        />
        <Choice
          label="Text size"
          value={settings.textSize}
          options={[
            [1, 'A'],
            [2, 'A+'],
            [3, 'A++'],
          ]}
          onChange={(v) => update({ textSize: v })}
        />
        {speechAvailable() && (
          <Choice label="Read aloud" value={settings.readAloud} options={onOff} onChange={(v) => update({ readAloud: v })} />
        )}
        <p className="settings__note">Your place in the book and these settings are saved on this device.</p>
      </div>
    </Panel>
  )
}
