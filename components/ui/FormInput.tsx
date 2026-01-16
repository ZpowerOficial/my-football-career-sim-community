import React from 'react';
import { Icon } from './Icon';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  icon?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
}

/**
 * FormInput Component
 *
 * Componente de input reutilizável com:
 * - Múltiplas variantes
 * - Labels e descrições
 * - Validação com mensagens de erro
 * - Ícones integrados
 * - Focus states
 * - Accessibility
 *
 * @example
 * ```tsx
 * <FormInput
 *   label="Nome do Jogador"
 *   type="text"
 *   placeholder="Ex: Cristiano Ronaldo"
 *   error={nameError}
 * />
 * ```
 */
const FormInput: React.FC<FormInputProps> = ({
  label,
  description,
  icon,
  error,
  helperText,
  variant = 'default',
  className = '',
  id = `input-${Math.random()}`,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-slate-800 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    filled: 'bg-slate-700/50 border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
    outlined: 'bg-transparent border border-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs uppercase tracking-wider font-bold text-slate-300">
          {label}
        </label>
      )}

      {description && (
        <p className="text-xs text-slate-400">{description}</p>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
            <i className={icon}></i>
          </div>
        )}
        <input
          id={id}
          className={`
            w-full px-3 py-2.5 text-sm text-white rounded-lg
            transition-all duration-200
            placeholder:text-slate-500
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-9' : ''}
            ${variantClasses[variant]}
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <Icon name="CircleAlert" size={12} />
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export default FormInput;
