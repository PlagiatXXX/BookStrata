import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { GlassEngine } from '@/GlassEngine'
import { StaticTierView } from '@/components/StaticTierView'
import { createLogger } from '@/lib/logger'
const logger = createLogger('GlasshouseHero', { color: 'green' })
import type { CollectionItem } from '@/types/collection'
import type { Tier, Book } from '@/types'
import './glasshouse.css'

import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/500.css'

gsap.registerPlugin(ScrollTrigger)

const SHARP = new URL('../../assets/greenhouse.webp', import.meta.url).href
const FOG = new URL('../../assets/greenhouse-fog.webp', import.meta.url).href

// In-memory cache: survives SPA navigation, reset on full reload
const maskCache = new Map<string, { mask: Float32Array; gw: number; gh: number; unlocked: boolean }>()

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const sweepOf = (p: number) => smooth(0.1, 0.48, p)
const zoomOf = (p: number) => 1 + 0.35 * smooth(0.55, 0.92, p)

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed to load ${src}`))
    img.src = src
  })
}

interface Props {
  collection: CollectionItem
  onViewBook?: (book: Book) => void
}

export default function ThemeGlasshouseHero({ collection, onViewBook }: Props) {
  const trackRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bladeRef = useRef<HTMLDivElement>(null)
  const clearRef = useRef<HTMLElement>(null)
  const engineRef = useRef<GlassEngine | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const progressRef = useRef(0)
  const writeRef = useRef(0)
  const reduced = usePrefersReducedMotion()

  const [state, setState] = useState<'loading' | 'ready' | 'nogl' | 'error'>('loading')
  const [unlocked, setUnlocked] = useState(false)
  const [cleared, setCleared] = useState(false)
  const unlockedRef = useRef(false)
  const restoredRef = useRef(false)
  useEffect(() => { unlockedRef.current = unlocked }, [unlocked])
  useLayoutEffect(() => {
    if (state !== 'ready' || restoredRef.current) return
    const slug = collection?.slug ?? 'default'
    const engine = engineRef.current
    if (!engine) return
    const cached = maskCache.get(slug)
    if (cached && engine.importMask(cached.mask, cached.gw, cached.gh)) {
      const val = cached.unlocked
      setTimeout(() => setUnlocked(val), 0)
    }
    restoredRef.current = true
  }, [state, collection?.slug])
  const title = collection.title
  const excerpt = collection.excerpt || ''

  const apply = (p: number) => {
    progressRef.current = p
    const stage = stageRef.current
    const eng = engineRef.current
    const h = stage?.clientHeight ?? 800
    const s = sweepOf(p)
    const y = -40 + (h + 80) * s
    if (bladeRef.current) {
      bladeRef.current.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
      bladeRef.current.style.visibility = s > 0 && s < 1 ? 'visible' : 'hidden'
    }
    if (eng) {
      eng.setBlade(s > 0 ? y : -1)
      eng.setZoom(zoomOf(p))
    }
  }

  useEffect(() => {
    let alive = true
    let cleanup = () => {}
    Promise.all([loadImage(SHARP), loadImage(FOG), document.fonts?.load('italic 100px "Instrument Serif"').catch(() => null)])
      .then(([sharp, fog]) => {
        const stage = stageRef.current
        const canvas = canvasRef.current
        if (!alive || !stage || !canvas) return
        const engine = new GlassEngine(canvas, sharp, fog)
        if (!engine.ok) {
          setState('nogl')
          return
        }
        engine.setText(title)
        engineRef.current = engine
        engine.reduced = reduced
        engine.fogDecay = 0
        engine.onClear = (f) => {
          if (clearRef.current) clearRef.current.textContent = `${String(Math.round(f * 100)).padStart(2, '0')}%`
          setUnlocked(f >= 0.5)
          setCleared(f >= 0.95)
        }
        engine.resize(stage.clientWidth, stage.clientHeight)
        engine.setWriting(writeRef.current)
        apply(progressRef.current)
        setState('ready')

        let running = false
        let inView = true
        const tick = (_t: number, dtMs: number) => {
          engine.step(dtMs / 1000)
          if (!engine.ok) setState('nogl')
        }
        const sync = () => {
          const want = inView && !document.hidden
          if (want && !running) gsap.ticker.add(tick)
          if (!want && running) gsap.ticker.remove(tick)
          running = want
        }
        const io = new IntersectionObserver(([e]) => {
          inView = e.isIntersecting
          sync()
        })
        if (trackRef.current) io.observe(trackRef.current)
        document.addEventListener('visibilitychange', sync)
        sync()
        const ro = new ResizeObserver(() => {
          engine.resize(stage.clientWidth, stage.clientHeight)
          apply(progressRef.current)
        })
        ro.observe(stage)

        const w = { p: writeRef.current }
        const tw = gsap.to(w, {
          p: 1,
          duration: reduced ? 0.01 : 2.4,
          delay: reduced ? 0 : 0.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            writeRef.current = w.p
            engine.setWriting(w.p)
          },
          onComplete: () => engine.dripFromWriting(5),
        })

        cleanup = () => {
          tw.kill()
          gsap.ticker.remove(tick)
          io.disconnect()
          ro.disconnect()
          document.removeEventListener('visibilitychange', sync)
          try {
            const exp = engine.exportMask()
            maskCache.set(collection?.slug ?? 'default', { ...exp, unlocked: unlockedRef.current })
          } catch (e) {
            logger.warn('cache save failed', { e })
          }
          engine.dispose()
          engineRef.current = null
        }
      })
      .catch((err) => {
        logger.error(err)
        if (alive) setState('error')
      })
    return () => {
      alive = false
      cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (engineRef.current) engineRef.current.reduced = reduced
  }, [reduced, state])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let down = false
    const local = (x: number, y: number) => {
      const r = stage.getBoundingClientRect()
      return { x: x - r.left, y: y - r.top }
    }
    const onUi = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, a')
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || onUi(e.target)) return
      const p = local(e.clientX, e.clientY)
      engineRef.current?.wipe(p.x, p.y, down ? 58 : 38)
    }
    const press = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') down = true
    }
    const release = () => { down = false }
    const leave = (e: PointerEvent) => e.pointerType !== 'touch' && engineRef.current?.lift()
    const tStart = (e: TouchEvent) => {
      if (onUi(e.target)) return
      engineRef.current?.lift()
      tMove(e)
    }
    const tMove = (e: TouchEvent) => {
      if (onUi(e.target)) return
      const t = e.touches[0]
      if (!t) return
      const p = local(t.clientX, t.clientY)
      engineRef.current?.wipe(p.x, p.y, 40)
    }
    const tEnd = () => engineRef.current?.lift()
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerdown', press)
    window.addEventListener('pointerup', release)
    stage.addEventListener('pointerleave', leave)
    stage.addEventListener('touchstart', tStart, { passive: true })
    stage.addEventListener('touchmove', tMove, { passive: true })
    stage.addEventListener('touchend', tEnd, { passive: true })
    return () => {
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerdown', press)
      window.removeEventListener('pointerup', release)
      stage.removeEventListener('pointerleave', leave)
      stage.removeEventListener('touchstart', tStart)
      stage.removeEventListener('touchmove', tMove)
      stage.removeEventListener('touchend', tEnd)
    }
  }, [])

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.085 })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
          .from('.cd-top > *', { opacity: 0, y: -8, duration: 1, stagger: 0.08 })
          .from('.cd-head .li', { yPercent: 110, duration: 1.6, stagger: 0.1 }, 0.2)
          .from('.cd-sub__in, .cd-dock__in', { opacity: 0, y: 10, duration: 1.2, stagger: 0.1 }, 0.8)
      }
      apply(0)
    }, stageRef)
    return () => ctx.revert()
  }, [reduced])


  const glass = state === 'ready'

  return (
    <section className="cd-root">
      <section ref={trackRef} className="cd-track" aria-label={`Теплица — ${title}`}>
        <div ref={stageRef} className={`cd-stage${glass ? ' is-live' : ''}`}>
          <div className="cd-under" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'auto', background: 'var(--cd-bg)', pointerEvents: unlocked ? 'auto' : 'none', cursor: unlocked ? 'pointer' : 'default' }}>
            <div style={{ height: '100%', overflow: 'auto', padding: 'clamp(20px, 3vw, 40px)' }}>
              {excerpt && <p style={{ color: 'var(--cd-soft)', fontSize: 13, marginBottom: 16, maxWidth: 380 }}>{excerpt}</p>}
              {collection.tiers && collection.tierOrder && collection.books && (
                <StaticTierView
                  tiers={collection.tiers as Record<string, Tier>}
                  tierOrder={collection.tierOrder}
                  books={collection.books as Record<string, Book>}
                  onViewBook={onViewBook}
                  unrankedBookIds={collection.unrankedBookIds}
                  linkToBook
                />
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="cd-gl" aria-hidden="true" style={{ zIndex: 1, background: 'transparent', pointerEvents: 'none' }} />
          {(state === 'nogl' || state === 'error') && (
            <div className="cd-fallback" aria-hidden="true">
              {state === 'nogl' && <img src={SHARP} alt="" />}
            </div>
          )}

          {/* перегородки убраны */}

          <div ref={bladeRef} className="cd-blade" aria-hidden="true">
            <i className="cd-blade__handle" />
            <i className="cd-blade__bar" />
          </div>

          <header className="cd-top">
            <span className="cd-top__r">
              Glass clear <b ref={clearRef}>00%</b>
            </span>
          </header>

          {/* cd-head убран: название выводится в тумане (writing) */}

          {/* cd-sub (aside) убран */}

          <div className="cd-dock">
            <div className="cd-dock__in">
              {!cleared && (
                <button type="button" onClick={() => { engineRef.current?.clearAll(); setCleared(true) }} disabled={!glass}>Очистить стекло</button>
              )}
            </div>
          </div>

          {/* cd-note и cd-final убраны: скролл-история отключена */}

          {state === 'loading' && (
            <div className="cd-loader" role="status">
              Warming the glass…
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
