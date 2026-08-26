import React, { useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  searchable = true,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredValues = filtered.map((opt) => opt.value);
  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every((v) => value.includes(v));
  const someFilteredSelected = filteredValues.some((v) => value.includes(v));

  const toggle = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const remove = (e, optValue) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      onChange(value.filter((v) => !filteredValues.includes(v)));
      return;
    }
    onChange([...new Set([...value, ...filteredValues])]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-auto min-h-9 w-full justify-between font-normal', className)}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((v) => {
                const label = options.find((o) => o.value === v)?.label || v;
                return (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="gap-1 border border-emerald-500/35 bg-emerald-500/15 text-emerald-400"
                  >
                    {label}
                    <button
                      type="button"
                      className="rounded-full hover:bg-emerald-500/20"
                      onClick={(e) => remove(e, v)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {searchable && (
          <div className="border-b p-2">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
        )}
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No options found.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-2 rounded-sm border-b px-2 py-1.5 text-sm font-medium hover:bg-accent"
                  onClick={toggleAllFiltered}
                >
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                  />
                  <span>{allFilteredSelected ? 'Deselect all' : 'Select all'}</span>
                </button>
                {filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => toggle(opt.value)}
                  >
                    <Checkbox checked={value.includes(opt.value)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
