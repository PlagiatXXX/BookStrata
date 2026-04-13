import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChange, placeholder = "Поиск..." }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isFocused) {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-(--accent-main)/50 focus-within:border-(--accent-main)/50">
      <Search size={16} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label="Поиск по названию"
        aria-keyshortcuts="/"
        className="bg-transparent text-sm placeholder-gray-500 text-gray-300 focus:outline-none min-w-37.5"
      />
      {!value && !isFocused && (
        <kbd className="hidden xl:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-600 bg-slate-700 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
          /
        </kbd>
      )}
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Очистить поиск"
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
