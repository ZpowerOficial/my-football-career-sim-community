import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "./Icon";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  /** Optional icon (emoji string or Lucide icon name) */
  icon?: string;
  /** If true, treat icon as Lucide icon name */
  isLucideIcon?: boolean;
  disabled?: boolean;
}

interface SelectProps<T = string> {
  /** Array of options to display */
  options: SelectOption<T>[];
  /** Currently selected value */
  value: T;
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Label above the select */
  label?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Accent color for focus/selected states */
  accentColor?: "blue" | "green" | "purple" | "amber" | "slate";
  /** Show icon in trigger button */
  showIcon?: boolean;
}

/**
 * Modern floating Select/Dropdown component.
 *
 * Key features:
 * - Floats ABOVE content (no bottom sheet behavior)
 * - Anchored directly below the trigger button
 * - Click-outside to close
 * - Escape key to close
 * - Smooth animations
 * - Supports emoji and Lucide icons
 *
 * @example
 * <Select
 *   value={selected}
 *   onChange={setSelected}
 *   options={[
 *     { value: 'opt1', label: 'Option 1', icon: '⭐' },
 *     { value: 'opt2', label: 'Option 2', icon: 'Trophy', isLucideIcon: true },
 *   ]}
 *   accentColor="amber"
 *   showIcon
 * />
 */
export function Select<T = string>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  disabled = false,
  className = "",
  size = "md",
  accentColor = "blue",
  showIcon = false,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find current selection
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  // Accent color configurations
  const accentClasses = {
    blue: {
      ring: "ring-blue-500 border-blue-500",
      selected: "bg-blue-600 text-white",
      hover: "hover:bg-slate-700",
      icon: "text-blue-400",
    },
    green: {
      ring: "ring-green-500 border-green-500",
      selected: "bg-green-600 text-white",
      hover: "hover:bg-slate-700",
      icon: "text-green-400",
    },
    purple: {
      ring: "ring-purple-500 border-purple-500",
      selected: "bg-purple-600 text-white",
      hover: "hover:bg-slate-700",
      icon: "text-purple-400",
    },
    amber: {
      ring: "ring-amber-500 border-amber-500",
      selected: "bg-amber-600 text-white",
      hover: "hover:bg-slate-700",
      icon: "text-amber-400",
    },
    slate: {
      ring: "ring-slate-500 border-slate-500",
      selected: "bg-slate-600 text-white",
      hover: "hover:bg-slate-700",
      icon: "text-slate-400",
    },
  };

  const colors = accentClasses[accentColor];

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-5 py-3 text-lg",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0;
            scrollToOption(next);
            return next;
          });
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            scrollToOption(next);
            return next;
          });
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
            handleSelect(options[highlightedIndex].value);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options]);

  // Scroll highlighted option into view
  const scrollToOption = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      if (items[index]) {
        items[index].scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleSelect = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        // Set initial highlight to current selection
        const currentIndex = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    }
  }, [disabled, isOpen, options, value]);

  // Render icon helper
  const renderIcon = (
    icon: string | undefined,
    isLucide: boolean | undefined,
    colorClass?: string,
  ) => {
    if (!icon) return null;

    if (isLucide) {
      return (
        <Icon
          name={icon as any}
          size={iconSizes[size]}
          variant="solid"
          className={colorClass || "text-slate-300"}
        />
      );
    }

    // Emoji icon
    return <span className="text-base leading-none">{icon}</span>;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          w-full flex items-center justify-between gap-2
          ${sizeStyles[size]}
          bg-slate-800 border border-slate-600
          rounded-xl
          text-white text-left
          transition-all duration-200
          focus:outline-none focus:ring-2 ${colors.ring}
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-slate-700 hover:border-slate-500 cursor-pointer"
          }
          ${isOpen ? `ring-2 ${colors.ring}` : ""}
        `}
      >
        <span
          className={`flex items-center gap-2 ${
            selectedOption ? "text-white" : "text-slate-400"
          }`}
        >
          {showIcon &&
            selectedOption?.icon &&
            renderIcon(
              selectedOption.icon,
              selectedOption.isLucideIcon,
              colors.icon,
            )}
          {displayLabel}
        </span>
        <Icon
          name="CaretDown"
          size={iconSizes[size]}
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown List - Always anchored below trigger */}
      <ul
        ref={listRef}
        role="listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined
        }
        className={`
          absolute z-[200] w-full mt-2
          bg-slate-800 border border-slate-600
          rounded-xl shadow-xl shadow-black/40
          max-h-60 overflow-auto
          transition-all duration-200 origin-top
          ${
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }
        `}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#475569 transparent",
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isHighlighted = index === highlightedIndex;
          const isDisabled = option.disabled;

          return (
            <li
              key={index}
              id={`option-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled}
              onClick={() => !isDisabled && handleSelect(option.value)}
              onMouseEnter={() => !isDisabled && setHighlightedIndex(index)}
              className={`
                ${sizeStyles[size]}
                flex items-center gap-2
                cursor-pointer
                transition-colors duration-150
                ${isSelected ? colors.selected : ""}
                ${
                  !isSelected && isHighlighted && !isDisabled
                    ? "bg-slate-700"
                    : ""
                }
                ${
                  !isSelected && !isHighlighted && !isDisabled
                    ? "text-slate-200"
                    : ""
                }
                ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                ${index === 0 ? "rounded-t-xl" : ""}
                ${index === options.length - 1 ? "rounded-b-xl" : ""}
              `}
            >
              {option.icon && (
                <span className="flex-shrink-0">
                  {renderIcon(
                    option.icon,
                    option.isLucideIcon,
                    isSelected ? "text-white" : colors.icon,
                  )}
                </span>
              )}
              <span className="flex-1 truncate">{option.label}</span>
              {isSelected && (
                <Icon
                  name="Check"
                  size={iconSizes[size]}
                  className="flex-shrink-0 text-white"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Select;
