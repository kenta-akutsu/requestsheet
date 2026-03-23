import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  loading?: boolean
}

const variantClasses = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
}

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8',
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  function AppButton({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          loading && 'opacity-70 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            処理中...
          </span>
        ) : children}
      </button>
    )
  }
)

AppButton.displayName = 'AppButton'
