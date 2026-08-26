import * as React from 'react';
import { format, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function parseDateValue(value) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function toDateValue(date) {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

function isDisabledDay(date, minDate, maxDate) {
  const day = startOfDay(date);
  const min = parseDateValue(minDate);
  const max = parseDateValue(maxDate);
  if (min && isBefore(day, startOfDay(min))) return true;
  if (max && isAfter(day, startOfDay(max))) return true;
  return false;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  minDate,
  maxDate,
  className,
  id,
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{selected ? format(selected, 'PPP') : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(toDateValue(date));
            if (date) setOpen(false);
          }}
          disabled={(date) => isDisabledDay(date, minDate, maxDate)}
          captionLayout="dropdown"
          className="rounded-lg border"
        />
      </PopoverContent>
    </Popover>
  );
}
