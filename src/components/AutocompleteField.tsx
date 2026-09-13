import {
  Combobox,
  ComboboxClear,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxTrigger,
} from "@/components/ui/combobox";

export interface AutocompleteOption {
  id: string;
  name: string;
}

interface AutocompleteFieldProps {
  id?: string;
  options: readonly AutocompleteOption[];
  /** Nombre seleccionado (string persistido). */
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  clearable?: boolean;
  "data-testid"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Select con búsqueda (mismo patrón que Autocomplete de concesionarias / MUI):
 * input filtrable + lista de opciones predefinidas (sin texto libre).
 */
export default function AutocompleteField({
  id,
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  disabled = false,
  emptyMessage = "Sin opciones",
  clearable = true,
  "data-testid": testId,
  "aria-invalid": ariaInvalid,
}: AutocompleteFieldProps) {
  const selected =
    options.find((option) => option.name === value) ??
    (value
      ? ({ id: `__selected:${value}`, name: value } satisfies AutocompleteOption)
      : null);

  const items =
    selected && !options.some((option) => option.name === selected.name)
      ? [selected, ...options]
      : [...options];

  return (
    <div data-testid={testId}>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(next) => {
          onChange(next?.name ?? "");
        }}
        itemToStringLabel={(item) => item?.name ?? ""}
        isItemEqualToValue={(a, b) => a.id === b.id || a.name === b.name}
        disabled={disabled}
      >
        <ComboboxInputGroup aria-invalid={ariaInvalid || undefined}>
          <ComboboxInput id={id} placeholder={placeholder} />
          {clearable && selected ? <ComboboxClear /> : null}
          <ComboboxTrigger />
        </ComboboxInputGroup>

        <ComboboxPortal>
          <ComboboxPositioner align="start">
            <ComboboxPopup>
              <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
              <ComboboxList>
                {(item: AutocompleteOption) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </ComboboxPositioner>
        </ComboboxPortal>
      </Combobox>
    </div>
  );
}
