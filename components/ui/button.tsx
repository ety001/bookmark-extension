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
        success: 'bg-[#10b981] text-white hover:bg-[#059669]', // 绿色，与 content-script.css 的编辑按钮一致
        warning: 'bg-[#fbbf24] text-white hover:bg-[#f59e0b]', // 橙色，与 content-script.css 的关闭按钮一致
        danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626]', // 红色，与 content-script.css 的删除按钮一致
        info: 'bg-[#3b82f6] text-white hover:bg-[#2563eb]', // 蓝色，与 content-script.css 的屏蔽按钮一致
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
    // 如果只有图标没有文字，图标不需要 margin
    const iconOnly = icon && !children;
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, circle, plain, className }))}
        ref={ref}
        {...props}
      >
        {icon && (
          <span className={iconOnly ? '' : 'mr-1'}>{icon}</span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

