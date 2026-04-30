import { motion } from "framer-motion";
import { memo } from "react";
import "./LibraryScene.css";

const BOOKS_PALETTE = [
  "var(--accent-main)",
  "#c1fffe", // Cyan
  "#ff51fa", // Pink
  "#ffbd58", // Orange
  "#ffffff"
];

const LibraryScene = memo(() => {
  // Генерация случайных книг для полок
  const renderBooks = (shelfY: number) => {
    return Array.from({ length: 12 }).map((_, i) => {
      const height = 60 + Math.random() * 40;
      const color = BOOKS_PALETTE[Math.floor(Math.random() * BOOKS_PALETTE.length)];
      return (
        <motion.div
          key={i}
          className="book-item"
          style={{
            left: `${40 + i * 42}px`,
            bottom: `${400 - shelfY}px`,
            height: `${height}px`,
            backgroundColor: color,
          }}
          whileHover={{ scale: 1.1 }}
        />
      );
    });
  };

  return (
    <div className="library-scene-root">
      <div className="library-container">
        {/* Light */}
        <div className="library-light" />
        <div className="light-beam" />

        {/* Shelves */}
        <div className="shelf shelf-top" />
        <div className="shelf shelf-middle" />
        <div className="shelf shelf-bottom" />

        {/* Books */}
        {renderBooks(80)}
        {renderBooks(200)}
        {renderBooks(320)}

        {/* Ladder */}
        <div className="ladder">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ladder-step" />
          ))}
        </div>

        {/* Floor shadow */}
        <div className="absolute -bottom-10 left-10 right-10 h-4 bg-black/40 blur-xl rounded-full" />
      </div>
    </div>
  );
});

export default LibraryScene;
