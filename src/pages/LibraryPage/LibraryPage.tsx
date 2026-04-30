import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import LibraryScene from "@/components/CommunityComponents/LibraryScene/LibraryScene";
import { motion } from "framer-motion";

export const LibraryPage = () => {
  return (
    <div className="min-h-screen bg-background-dark">
      <Header activeItem="Библиотека" />

      <main className="relative pt-16 overflow-hidden">
        {/* Abstract Background Decor */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,79,43,0.05),transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl mb-6"
            >
              ВАША ЦИФРОВАЯ <br />
              <span className="text-(--accent-main)">БИБЛИОТЕКА</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-(--ink-1) max-w-2xl mx-auto"
            >
              Исследуйте бесконечные стеллажи знаний и структурируйте свои идеи
              с помощью мощных инструментов BookStrata Pro.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <LibraryScene />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mt-24">
            {[
              { title: "Организация", desc: "Сортируйте книги по жанрам, авторам или личным предпочтениям." },
              { title: "Визуализация", desc: "Превращайте списки в наглядные тир-листы за считанные секунды." },
              { title: "Сообщество", desc: "Делитесь своими находками с тысячами других читателей." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="brutal-card p-8 bg-surface-container-low border-4 border-black"
              >
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">{feature.title}</h3>
                <p className="text-(--ink-1)">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
