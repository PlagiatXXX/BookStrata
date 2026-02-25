import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChange, placeholder = "Поиск..." }: SearchBarProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700/50">
      <Search size={16} />
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="bg-transparent text-sm placeholder-gray-500 text-gray-300 focus:outline-none min-w-37.5"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-gray-400 hover:text-gray-200 cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};