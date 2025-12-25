import { useState } from "react";

interface SettingTooltipProps {
  label: string;
  tooltip: string;
  value: number | string;
  onChange: (value: string) => void;
  type?: "number" | "text" | "time";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  unit?: string;
  hint?: string;
}

export function SettingInput({
  label,
  tooltip,
  value,
  onChange,
  type = "number",
  min,
  max,
  step,
  placeholder,
  required = true,
  unit,
  hint
}: SettingTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Xử lý thời gian (HH:MM)
  if (type === "time") {
    const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const timeValue = event.target.value;
      if (timeValue) {
        const [hours] = timeValue.split(":");
        onChange(hours);
      }
    };

    const timeValue = value ? `${String(value).padStart(2, "0")}:00` : "00:00";

    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative group">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-gray-400 hover:text-pink-500 transition-colors"
              title={tooltip}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {showTooltip && (
              <div className="absolute left-0 mt-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 mb-2">
                <div className="absolute bottom-full left-2 w-2 h-2 bg-gray-900 transform rotate-45 -mb-1"></div>
                {tooltip}
              </div>
            )}
          </div>
        </div>

        <input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
        />

        {hint && (
          <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-200">
            💡 {hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 hover:text-pink-500 transition-colors"
            title={tooltip}
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          
          {showTooltip && (
            <div className="absolute left-0 mt-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 mb-2">
              <div className="absolute bottom-full left-2 w-2 h-2 bg-gray-900 transform rotate-45 -mb-1"></div>
              {tooltip}
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {hint && (
        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-200">
          💡 {hint}
        </p>
      )}
    </div>
  );
}
