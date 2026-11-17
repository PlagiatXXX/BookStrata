import { Dna, Sparkles } from "lucide-react"
import type { PublicUserDna } from "@/lib/userApi"

interface ProfileDnaCardProps {
  dna: PublicUserDna | null
  isOwner: boolean
}

/**
 * Миниатюра читательского билета (спека §6.5).
 * НЕ ArchivalTicketCard (тому нужны axes): простая карточка — архетип, девиз, номер билета.
 * Вся карточка — ссылка на вкладку «Сравнение вкусов» страницы ДНК.
 * Нет билета: владельцу — CTA «Пройти тест», посетителю — блок скрыт.
 */
export function ProfileDnaCard({ dna, isOwner }: ProfileDnaCardProps) {
  if (!dna && !isOwner) return null

  return (
    <section aria-label="Читательский ДНК" className="profile-section">
      <span className="profile-pill-label">Читательский ДНК</span>
      {dna ? (
        <a
          href={`/reading-dna?ticket=${dna.ticketNumber}&tab=compare`}
          className="profile-dna-card"
        >
          <div className="profile-dna-card__row">
            <span className="profile-dna-card__archetype">
              <Dna size={18} aria-hidden="true" />
              {dna.archetypeName}
            </span>
            <span className="profile-dna-card__ticket">#{dna.ticketNumber}</span>
          </div>
          {dna.motto && (
            <p className="profile-dna-card__motto">«{dna.motto}»</p>
          )}
        </a>
      ) : (
        <a href="/reading-dna" className="profile-dna-card profile-dna-card--cta">
          <Sparkles size={18} aria-hidden="true" />
          Пройти тест на читательский ДНК
        </a>
      )}
    </section>
  )
}
