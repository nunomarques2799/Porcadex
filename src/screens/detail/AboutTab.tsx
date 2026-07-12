import { Phone, Instagram, MapPin, Globe } from 'lucide-react'
import type { Person } from '../../types'
import { formatDate, instagramLink, phoneLink } from '../../lib/utils'
import { countryName } from '../../data/countries'

export function AboutTab({ person, accent }: { person: Person; accent: string }) {
  const { about } = person
  const rows: { label: string; value: string }[] = []
  if (about.howWeMet)
    rows.push({ label: 'Como nos conhecemos', value: about.howWeMet })
  if (about.birthday)
    rows.push({ label: 'Aniversário', value: formatDate(about.birthday) })
  if (about.since)
    rows.push({ label: 'Conhecidos desde', value: formatDate(about.since) })

  const country = countryName(person.country)
  const hasContact = !!(about.phone || about.instagram || about.location || country)
  const isEmpty =
    rows.length === 0 &&
    !hasContact &&
    person.traits.length === 0 &&
    !person.notes

  if (isEmpty) {
    return (
      <p className="muted-block">
        Ainda não há informação. Toca em editar para adicionar detalhes.
      </p>
    )
  }

  const ig = about.instagram ? instagramLink(about.instagram) : null

  return (
    <div className="about">
      {rows.length > 0 && (
        <dl className="about__rows">
          {rows.map((r) => (
            <div className="about__row" key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {hasContact && (
        <div className="contact-list">
          {country && (
            <div className="contact" style={{ ['--accent' as string]: accent }}>
              <span className="contact__icon">
                <Globe size={18} />
              </span>
              <div className="contact__text">
                <span className="contact__label">País</span>
                <span className="contact__value">{country}</span>
              </div>
            </div>
          )}
          {about.location && (
            <div className="contact" style={{ ['--accent' as string]: accent }}>
              <span className="contact__icon">
                <MapPin size={18} />
              </span>
              <div className="contact__text">
                <span className="contact__label">Localização</span>
                <span className="contact__value">{about.location}</span>
              </div>
            </div>
          )}
          {about.phone && (
            <a
              className="contact contact--link"
              href={phoneLink(about.phone)}
              style={{ ['--accent' as string]: accent }}
            >
              <span className="contact__icon">
                <Phone size={18} />
              </span>
              <div className="contact__text">
                <span className="contact__label">Telemóvel</span>
                <span className="contact__value">{about.phone}</span>
              </div>
            </a>
          )}
          {ig && (
            <a
              className="contact contact--link"
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ['--accent' as string]: accent }}
            >
              <span className="contact__icon">
                <Instagram size={18} />
              </span>
              <div className="contact__text">
                <span className="contact__label">Instagram</span>
                <span className="contact__value">{ig.display}</span>
              </div>
            </a>
          )}
        </div>
      )}

      {person.traits.length > 0 && (
        <section className="about__section">
          <h3 className="about__heading">Características</h3>
          <div className="trait-list">
            {person.traits.map((t) => (
              <span className="trait" key={t}>
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {person.notes && (
        <section className="about__section">
          <h3 className="about__heading">Notas</h3>
          <p className="about__notes">{person.notes}</p>
        </section>
      )}
    </div>
  )
}
