'use client';

import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { title: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-xl border-t bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-xl md:border-t-0 md:border-l md:data-[state=open]:slide-in-from-right',
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-center justify-between">
          <SheetPrimitive.Title className="font-display text-lg font-bold">{title}</SheetPrimitive.Title>
          <SheetPrimitive.Close className="rounded-full p-2 hover:bg-soft" aria-label="Fechar">
            <XIcon className="size-4" />
          </SheetPrimitive.Close>
        </div>
        <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTrigger };
