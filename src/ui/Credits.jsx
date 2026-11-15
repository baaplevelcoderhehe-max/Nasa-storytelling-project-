import React from 'react'
import Panel from './Panel'
import { SOURCE_GROUPS } from '../data/sources'

const TEAM = [
  ['Ghulam Hussain Khan', 'Main Developer'],
  ['Hammad Ali Butt', 'Main Developer'],
  ['Fibonacci Team', 'Co-Developers'],
]

function Ext({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="credits__link">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

export default function Credits({ onClose }) {
  return (
    <Panel title="Credits" onClose={onClose} wide>
      <div className="credits">
        <section aria-labelledby="credits-team">
          <h3 id="credits-team" className="credits__heading">
            Made by
          </h3>
          <ul className="credits__team">
            {TEAM.map(([name, role]) => (
              <li key={name}>
                <strong>{name}</strong> — {role}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="credits-sources">
          <h3 id="credits-sources" className="credits__heading">
            Sources
          </h3>
          {SOURCE_GROUPS.map((g) => (
            <div key={g.chapter} className="credits__group">
              <h4 className="credits__chapter">{g.chapter}</h4>
              <ul>
                {g.links.map(([label, url]) => (
                  <li key={url}>
                    <Ext href={url}>{label}</Ext>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="credits-assets">
          <h3 id="credits-assets" className="credits__heading">
            Sounds, fonts and code
          </h3>
          <ul>
            <li>
              Interface sounds and emotes by <Ext href="https://kenney.nl">Kenney</Ext> (CC0).
            </li>
            <li>
              The Fredoka font, under the <Ext href="https://openfontlicense.org">SIL Open Font License</Ext>.
            </li>
            <li>
              The layer shader is based on work by Gianmarco Simone (<Ext href="https://twitter.com/ggsimm">@ggsimm</Ext>).
            </li>
            <li>Ambient music: source to be confirmed.</li>
          </ul>
        </section>

        <p className="credits__note">This project is not affiliated with or endorsed by NASA.</p>
      </div>
    </Panel>
  )
}
