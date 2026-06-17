import React from "react";

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
  disabled = false,
}) => {
  const handleChange = () => {
    if (!disabled) {
      onCheckedChange?.(!checked);
    }
  };

  return (
    <label
      className={`relative inline-flex cursor-pointer items-center ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        id={id}
      />
      <div
        className={`shadow-md peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#c1fffe] peer-focus:ring-offset-2 peer-focus:ring-offset-black outline-none duration-300 relative h-8 w-16 rounded-full ${
          checked ? "bg-emerald-500" : "bg-red-500"
        }`}
      >
        {/* Ползунок */}
        <span
          className={`duration-300 absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 shadow-sm transition-transform ${
            checked ? "translate-x-8" : ""
          }`}
        >
          {/* Closed lock — виден когда не checked (приватный) */}
          <svg
            className={`h-5 w-5 transition-opacity ${
              checked ? "opacity-0" : "opacity-100"
            }`}
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z"
              fill="#121212"
              fillRule="evenodd"
            />
          </svg>
          {/* Open lock — виден когда checked (публичный) */}
          <svg
            className={`absolute h-5 w-5 transition-opacity ${
              checked ? "opacity-100" : "opacity-0"
            }`}
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z"
              fill="#121212"
            />
          </svg>
        </span>
      </div>
    </label>
  );
};
