import React, { useState, useCallback, useRef, useEffect } from "react";
import { Icon, type IconName } from "./ui/Icon";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Can be an emoji string or a Lucide IconName */
  icon?: string | IconName;
  /** If true, treat icon as a Lucide IconName */
  isLucideIcon?: boolean;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  accentColor?: "blue" | "green" | "purple" | "amber" | "slate";
  showIcon?: boolean;
  disabled?: boolean;
}

/**
 * Custom Select Component
 *
 * A modal-based dropdown that works consistently across web and Android.
 * Replaces native <select> elements for better UI/UX on mobile.
 * Supports both emoji strings and Lucide icons.
 */
const CustomSelect = <T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  accentColor = "blue",
  showIcon = false,
  disabled = false,
}: CustomSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current option
  const currentOption = options.find((opt) => opt.value === value);

  // Accent color classes
  const accentClasses = {
    blue: {
      ring: "focus:ring-blue-500/50 focus:border-blue-500/50",
      hover: "hover:bg-blue-500/10",
      selected: "bg-blue-500/20 border-blue-500/50",
      text: "text-blue-400",
    },
    green: {
      ring: "focus:ring-green-500/50 focus:border-green-500/50",
      hover: "hover:bg-green-500/10",
      selected: "bg-green-500/20 border-green-500/50",
      text: "text-green-400",
    },
    purple: {
      ring: "focus:ring-purple-500/50 focus:border-purple-500/50",
      hover: "hover:bg-purple-500/10",
      selected: "bg-purple-500/20 border-purple-500/50",
      text: "text-purple-400",
    },
    amber: {
      ring: "focus:ring-amber-500/50 focus:border-amber-500/50",
      hover: "hover:bg-amber-500/10",
      selected: "bg-amber-500/20 border-amber-500/50",
      text: "text-amber-400",
    },
    slate: {
      ring: "focus:ring-slate-500/50 focus:border-slate-500/50",
      hover: "hover:bg-slate-500/10",
      selected: "bg-slate-500/20 border-slate-500/50",
      text: "text-slate-400",
    },
  };

  const colors = accentClasses[accentColor];

  // Handle selection
  const handleSelect = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Render icon - supports both emoji strings and Lucide icons
  const renderIcon = (
    icon: string | IconName | undefined,
    isLucide?: boolean,
    colorClass?: string,
  ) => {
    if (!icon) return null;

    // Check if it's a Lucide icon (either explicitly marked or matches pattern)
    if (isLucide || isLucideIconName(icon)) {
      return (
        <Icon
          name={icon as IconName}
          size={16}
          variant="solid"
          className={colorClass || "text-slate-300"}
        />
      );
    }

    // Emoji or string icon
    return <span className="text-base">{icon}</span>;
  };

  // Helper to detect if string is likely a Lucide icon name
  const isLucideIconName = (icon: string): boolean => {
    // Lucide icons are PascalCase without spaces or emojis
    return /^[A-Z][a-zA-Z0-9]*$/.test(icon);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full bg-[#151d30] text-white rounded-lg px-4 py-3 pr-10
          border border-slate-700/50 hover:border-slate-600/70
          transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 ${colors.ring}
          font-medium text-sm text-left
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isOpen ? "ring-2 " + colors.ring : ""}
        `}
      >
        <span className="flex items-center gap-2">
          {showIcon &&
            currentOption?.icon &&
            renderIcon(
              currentOption.icon,
              currentOption.isLucideIcon,
              colors.text,
            )}
          <span className={currentOption ? "text-white" : "text-slate-400"}>
            {currentOption?.label || placeholder}
          </span>
        </span>
      </button>

      {/* Dropdown Arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
        <Icon
          name="CaretDown"
          size={14}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown Options - Modal Style for Android */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Options Container */}
          <div
            className={`
              absolute z-50 w-full mt-1
              bg-[#1a2438] rounded-xl shadow-2xl
              border border-slate-700/50
              overflow-hidden
              max-h-64 overflow-y-auto
              animate-fade-in-up

              /* Mobile: Bottom sheet style */
              md:relative md:mt-1
              fixed md:fixed-none
              bottom-0 md:bottom-auto
              left-0 md:left-auto
              right-0 md:right-auto
              md:w-full
              rounded-t-2xl md:rounded-xl
              max-h-[50vh] md:max-h-64
            `}
            style={{
              maxHeight: "min(50vh, 300px)",
            }}
          >
            {/* Mobile Handle */}
            <div className="md:hidden flex justify-center py-2 bg-slate-800/50">
              <div className="w-10 h-1 rounded-full bg-slate-600"></div>
            </div>

            {/* Options List */}
            <div className="py-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full px-4 py-3 text-left text-sm
                      flex items-center gap-3
                      transition-colors duration-150
                      ${
                        isSelected
                          ? `${colors.selected} ${colors.text} font-semibold`
                          : `text-white ${colors.hover}`
                      }
                    `}
                  >
                    {option.icon && (
                      <span className="w-6 text-center flex items-center justify-center">
                        {renderIcon(
                          option.icon,
                          option.isLucideIcon,
                          isSelected ? colors.text : "text-slate-400",
                        )}
                      </span>
                    )}
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <Icon name="Check" size={14} className={colors.text} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomSelect;
