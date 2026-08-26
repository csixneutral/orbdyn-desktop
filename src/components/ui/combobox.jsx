import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ComboboxContext = React.createContext(null);

function Combobox({ items = [], value, onValueChange, disabled = false, children }) {
  const [open, setOpen] = React.useState(false);

  return (
    <ComboboxContext.Provider value={{ items, value, onValueChange, open, setOpen, disabled }}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  );
}

function ComboboxInput({ placeholder, className, loading = false, ...props }) {
  const { value, open, disabled } = React.useContext(ComboboxContext);

  return (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled || loading}
        className={cn('h-9 w-full justify-between font-normal', className)}
        {...props}
      >
        <span className="truncate">{value || placeholder}</span>
        {loading ? (
          <Spinner className="ml-2 h-4 w-4 shrink-0 text-current" />
        ) : (
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>
    </PopoverTrigger>
  );
}

function ComboboxContent({ children, className }) {
  return (
    <PopoverContent className={cn('w-[var(--radix-popover-trigger-width)] p-0', className)} align="start">
      <Command>
        <CommandInput placeholder="Search..." />
        {children}
      </Command>
    </PopoverContent>
  );
}

function ComboboxEmpty({ children }) {
  return <CommandEmpty>{children}</CommandEmpty>;
}

function ComboboxList({ children }) {
  const { items } = React.useContext(ComboboxContext);

  return (
    <CommandList>
      {items.map((item) => children(item))}
    </CommandList>
  );
}

function ComboboxItem({ value: itemValue, children, className }) {
  const { value, onValueChange, setOpen } = React.useContext(ComboboxContext);

  return (
    <CommandItem
      value={itemValue}
      onSelect={() => {
        onValueChange?.(itemValue);
        setOpen(false);
      }}
      className={className}
    >
      <Check className={cn('mr-2 h-4 w-4', value === itemValue ? 'opacity-100' : 'opacity-0')} />
      {children}
    </CommandItem>
  );
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
};
