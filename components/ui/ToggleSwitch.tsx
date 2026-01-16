import React from "react";

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id = `toggle-${Math.random()}`,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: "44px",
        minWidth: "44px",
        maxWidth: "44px",
        height: "22px",
        minHeight: "22px",
        maxHeight: "22px",
        borderRadius: "9999px",
        backgroundColor: checked ? "#22c55e" : "#475569",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        flexGrow: 0,
        flexBasis: "44px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 200ms ease-in-out",
        border: "none",
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "9999px",
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transform: checked ? "translateX(24px)" : "translateX(2px)",
          transition: "transform 200ms ease-in-out",
          display: "inline-block",
        }}
      />
    </button>
  );
};

export default ToggleSwitch;
