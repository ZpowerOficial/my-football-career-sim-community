import React from "react";
import { Icon, type IconName } from "./Icon";

interface CardProps {
  title?: string;
  description?: string;
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "elevated";
  interactive?: boolean;
}

/**
 * Card Component
 *
 * Componente de card reutilizável com:
 * - Múltiplas variantes de estilo
 * - Header com ícone
 * - Efeitos de hover
 * - Transições suaves
 * - Layout flexível
 *
 * @example
 * ```tsx
 * <Card
 *   title="Estatísticas"
 *   icon="ChartColumn"
 *   variant="gradient"
 * >
 *   Conteúdo aqui
 * </Card>
 * ```
 */
const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  children,
  className = "",
  variant = "default",
  interactive = false,
}) => {
  const variantClasses = {
    default: "bg-slate-800/50 border border-slate-700/50",
    gradient:
      "bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/30",
    elevated:
      "bg-slate-900 border border-slate-600/50 shadow-xl shadow-black/50",
  };

  return (
    <div
      className={`
        rounded-xl p-4 transition-all duration-300
        ${variantClasses[variant]}
        ${interactive ? "cursor-pointer hover:shadow-lg hover:shadow-slate-900/50 hover:scale-[1.02]" : ""}
        ${className}
      `}
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
              <Icon name={icon} size={14} className="text-slate-300" />
            </div>
          )}
          {title && (
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {description && (
                <p className="text-xs text-slate-400">{description}</p>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
