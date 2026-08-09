import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_8px_18px_rgba(23,101,233,.22)] hover:bg-brand-500 hover:shadow-[0_10px_24px_rgba(23,101,233,.3)] focus-visible:outline-brand-600',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white shadow-[0_8px_18px_rgba(220,38,38,.16)] hover:bg-red-500 focus-visible:outline-red-600',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-brand-600',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.98] ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
