import type * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border bg-background px-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-md border bg-background px-3 py-2 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
