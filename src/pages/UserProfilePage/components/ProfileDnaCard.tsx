import { Dna, Sparkles } from "lucide-react"
import type { PublicUserDna } from "@/lib/userApi"
import type { DnaAxesData } from "@/lib/readingDnaApi"
import { ArchivalTicketCard } from "@/pages/ReadingDnaPage/components/ArchivalTicketCard"

interface ProfileDnaCardProps {
  dna: PublicUserDna | null
  isOwner: boolean
  axes?: DnaAxesData | null
}

/**
 * Миниатюра читательского билета (спека §6.5).
 * При наличии осей — настоящий ArchivalTicketCard в масштабе (как на странице ДНК).
 * Без осей — компактная карточка: архетип, девиз, номер билета.
 * Вся карточка — ссылка на вкладку «Сравнение вкусов» страницы ДНК.
 * Нет билета: владельцу — CTA «Пройти тест», посетителю — блок скрыт.
 */
export function ProfileDnaCard({ dna, isOwner, axes }: ProfileDnaCardProps) {
  if (!dna && !isOwner) return null

  const hasAxes = !!axes && Object.values(axes).some((v) => (v ?? 0) > 0)

  return (
    <section aria-label="Читательский ДНК" className="profile-section">
      <span className="profile-pill-label">Читательский ДНК</span>
      {dna ? (
        <a
          href={`/reading-dna?ticket=${dna.ticketNumber}&tab=compare`}
          className="profile-dna-card profile-dna-card--ticket"
        >
          {hasAxes ? (
            <div
              className="profile-dna-card__ticket-wrap"
              style={{ height: 170, overflow: "hidden", pointerEvents: "none" }}
            >
              <div
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "top left",
                  width: 220,
                }}
              >
                <ArchivalTicketCard
                  ticketNumber={dna.ticketNumber}
                  archetypeName={dna.archetypeName}
                  axes={axes!}
                  theme="dark"
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
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
