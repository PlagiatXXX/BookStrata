import { Search, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChange, placeholder = "Поиск..." }: SearchBarProps) => {
  const { theme } = useTheme();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 dark:bg-slate-800/50 light:bg-white/50 text-gray-400 dark:text-gray-400 light:text-gray-600 border border-slate-700/50 dark:border-slate-700/50 light:border-gray-300/50">
      <Search size={16} />
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`bg-transparent text-sm placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-600 focus:outline-none min-w-37.5 ${
          theme === 'light' 
            ? 'text-gray-700' 
            : 'text-gray-300'
        }`}
      />
      {value && (
        <button 
          onClick={() => onChange('')}
          className="text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-gray-200 dark:hover:text-gray-200 light:hover:text-gray-800 cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};