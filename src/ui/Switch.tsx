import React from 'react';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onCheckedChange,
  id,
  disabled = false
}) => {
  const handleChange = () => {
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      onClick={handleChange}
      disabled={disabled}
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked
          ? 'bg-blue-600'
          : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};