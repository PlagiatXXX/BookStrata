import { MonitorOff } from "lucide-react";

interface StreamModeExitButtonProps {
  onExit: () => void;
}

export function StreamModeExitButton({ onExit }: StreamModeExitButtonProps) {
  return (
    <button
      onClick={onExit}
      className="group fixed top-1 right-4 z-50 flex items-center gap-1.5 rounded border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white cursor-pointer"
      title="Выйти из режима стрима"
      aria-label="Выйти из режима стрима"
    >
      <MonitorOff size={12} />
      Стрим
    </button>
  );
}
