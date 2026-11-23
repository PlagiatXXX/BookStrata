import type { PublicUserDna } from "@/lib/userApi"
import type { DnaAxesData, DnaBookItemData } from "@/lib/readingDnaApi"
import { ArchivalTicketCard } from "@/pages/ReadingDnaPage/components/ArchivalTicketCard"

export interface ProfileDnaCardProps {
  dna: PublicUserDna | null
  isOwner: boolean
  axes?: DnaAxesData | null
  favoriteBooks?: (DnaBookItemData | null)[]
  kryptoniteBook?: DnaBookItemData | null
}

/**
 * Читательский билет ДНК (спека §6.5).
 * - При наличии билета — живая миниатюра ArchivalTicketCard со всеми эффектами.
 * - При отсутствии — пунктирная карточка с CTA владельцу, посетителю — null.
 */
export function ProfileDnaCard({
  dna,
  isOwner,
  axes,
  favoriteBooks = [],
  kryptoniteBook = null,
}: ProfileDnaCardProps) {
  if (!dna) {
    return (
      <section
        className="card profile-dna-card"
        style={{ borderStyle: "dashed", display: "flex", flexDirection: "column" }}
        aria-label="Читательский ДНК"
      >
        <h2 className="h" style={{ margin: "0 0 4px" }}>
          Читательский ДНК
        </h2>
        <div className="m" style={{ marginBottom: 14 }}>
          Литературный психотип, оси восприятия и совместимость
        </div>

        {isOwner ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#d4d6e4" }}>
              Вы ещё не прошли тест на читательский ДНК. Пройдите 6 осей восприятия, найдите свой архетип и откройте литературных близнецов.
            </p>
            <div>
              <a href="/reading-dna" className="btn pri" style={{ textDecoration: "none", display: "inline-flex" }}>
                Пройти тест
              </a>
            </div>
          </div>
        ) : (
          <p className="m" style={{ margin: 0, lineHeight: 1.5 }}>
            Пользователь пока не прошёл тест на читательский ДНК.
          </p>
        )}
      </section>
    )
  }

  const hasAxes = !!axes && Object.values(axes).some((v) => (v ?? 0) > 0)

  return (
    <section className="card" aria-label="Читательский ДНК" style={{ padding: 20 }}>
      <h2 className="h" style={{ marginBottom: 14 }}>Читательский ДНК</h2>
      <a
        href={`/reading-dna?ticket=${dna.ticketNumber}&tab=compare`}
        className="block transition-transform hover:scale-[1.01]"
        style={{ textDecoration: "none" }}
        aria-label={`${dna.archetypeName} #${dna.ticketNumber}`}
      >
        {hasAxes ? (
          <ArchivalTicketCard
            ticketNumber={dna.ticketNumber}
            archetypeName={dna.archetypeName}
            axes={axes!}
            favoriteBooks={favoriteBooks}
            kryptoniteBook={kryptoniteBook}
            theme="dark"
            isSealed={true}
          />
        ) : (
          <div style={{ background: "#232340", borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 16, color: "#fbbf24" }}>{dna.archetypeName}</b>
              <span className="m">#{dna.ticketNumber}</span>
            </div>
            {dna.motto && (
              <p style={{ margin: 0, fontSize: 13, color: "#d4d6e4", fontStyle: "italic" }}>
                «{dna.motto}»
              </p>
            )}
          </div>
        )}
      </a>
    </section>
  )
}
