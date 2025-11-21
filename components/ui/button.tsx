import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-[#4285d6]',
        primary: 'bg-primary text-white hover:bg-[#4285d6]',
        success: 'bg-green-500 text-white hover:bg-green-600',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        info: 'bg-gray-500 text-white hover:bg-gray-600',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        mini: 'h-6 px-2 text-xs rounded',
        small: 'h-8 px-3 text-sm rounded',
        icon: 'h-10 w-10',
      },
      circle: {
        true: 'rounded-full',
        false: '',
      },
      plain: {
        true: 'bg-gray-300 border border-gray-400 text-gray-800 hover:bg-gray-400',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      circle: false,
      plain: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, circle, plain, icon, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, circle, plain, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

