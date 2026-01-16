import React from "react";
import { Icon, type IconName } from "./Icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: IconName;
  children: React.ReactNode;
}

/**
 * Button Component
 *
 * Componente de botão reutilizável com:
 * - Múltiplas variantes de estilo
 * - Tamanhos escaláveis
 * - Estado de loading
 * - Ícone integrado
 * - Transições suaves
 * - Accessibility features
 *
 * @example
 * ```tsx
 * <Button variant="success" size="md" icon="Play">
 *   Começar Carreira
 * </Button>
 * ```
 */
const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className = "",
  children,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-bold rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
    whitespace-nowrap
  `;

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-green-500 to-blue-600 text-white hover:shadow-lg hover:shadow-green-500/30 focus:ring-green-400",
    secondary:
      "bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-400",
    success: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-400",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
    ghost:
      "bg-transparent text-slate-300 hover:bg-slate-800/50 focus:ring-slate-400",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && (
        <Icon
          name={loading ? "LoaderCircle" : icon}
          size={iconSizes[size]}
          className={loading ? "animate-spin" : ""}
        />
      )}
      {loading ? "..." : children}
    </button>
  );
};

export default Button;
