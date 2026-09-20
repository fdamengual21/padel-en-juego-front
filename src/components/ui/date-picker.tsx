import { useMemo, useState, type ComponentProps } from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatIsoDateOnlyEs,
  parseIsoDateOnly,
  toIsoDateOnly,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Límite inferior `yyyy-MM-dd`. */
  minDate?: string;
  /** Límite superior `yyyy-MM-dd`. */
  maxDate?: string;
  captionLayout?: ComponentProps<typeof Calendar>["captionLayout"];
  invalid?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Elegí una fecha",
  minDate,
  maxDate,
  captionLayout = "dropdown",
  invalid = false,
  allowClear = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDateOnly(value);
  const min = parseIsoDateOnly(minDate);
  const max = parseIsoDateOnly(maxDate);

  const startMonth = useMemo(() => {
    if (min) return new Date(min.getFullYear(), min.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear() - 20, 0, 1);
  }, [min]);

  const endMonth = useMemo(() => {
    if (max) return new Date(max.getFullYear(), max.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear() + 5, 11, 1);
  }, [max]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "h-8 w-full min-w-0 justify-start gap-2 px-2.5 font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {selected ? formatIsoDateOnlyEs(value) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[60] w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          captionLayout={captionLayout}
          selected={selected}
          defaultMonth={selected ?? max ?? new Date()}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={[
            ...(min ? [{ before: min }] : []),
            ...(max ? [{ after: max }] : []),
          ]}
          onSelect={(date) => {
            onChange(date ? toIsoDateOnly(date) : null);
            setOpen(false);
          }}
        />
        {allowClear && selected ? (
          <div className="border-t border-border px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Quitar fecha
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
