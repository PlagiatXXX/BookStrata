import { Mail } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-(--accent-main)/10 border border-(--accent-main)/20 flex items-center justify-center mx-auto">
          <Mail size={32} className="text-(--accent-main)" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Контакты</h1>
        <p className="text-(--ink-1) text-sm leading-relaxed">
          Если у вас есть вопросы, предложения или запросы об удалении контента — напишите нам.
        </p>
        <a
          href="mailto:fedorpasyada@yandex.ru"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-(--ink-0) text-(--bg-0) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Mail size={16} />
          fedorpasyada@yandex.ru
        </a>
      </div>
    </div>
  )
}
