import { useState } from "react";
import { formatDate, monthOf, todayISO } from "../lib/dates";
import { MonthCalendar } from "./Calendar";

// Elegir una fecha (o un periodo) en un calendario mensual siempre visible.
// Guarda el valor en campos ocultos para que lo lea el formulario.
export function DatePicker({
  name, endName, min, value, onChange, marks,
}: {
  name: string;
  endName?: string; // si se da, se elige un periodo: primer clic = desde, segundo = hasta
  min?: string;
  value: { from: string | null; to: string | null };
  onChange: (value: { from: string | null; to: string | null }) => void;
  marks?: (day: string) => string; // clases para marcar días (por ejemplo, cerrados)
}) {
  const [month, setMonth] = useState(monthOf(value.from ?? todayISO()));
  const { from, to } = value;
  const end = to ?? from;

  function pick(day: string) {
    if (!endName || !from || to || day < from) onChange({ from: day, to: null });
    else onChange({ from, to: day === from ? null : day });
  }

  return (
    <div>
      <MonthCalendar
        compact
        month={month}
        onMonthChange={setMonth}
        minMonth={min}
        isDisabled={(d) => !!min && d < min}
        onDayClick={pick}
        dayClass={(d) =>
          from && d >= from && end && d <= end
            ? d === from || d === end ? "!border-ink !bg-ink text-white" : "!border-sky !bg-sky-tint"
            : marks?.(d) ?? ""
        }
      />
      <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
        {!from ? (endName ? "Toca el primer día (y después el último, si son varios)." : "Toca un día del calendario.")
          : to ? <>Del <strong>{formatDate(from)}</strong> al <strong>{formatDate(to)}</strong></>
          : <><strong>{formatDate(from)}</strong>{endName ? ". Toca otro día si quieres un periodo." : ""}</>}
      </p>
      <input type="hidden" name={name} value={from ?? ""} />
      {endName && <input type="hidden" name={endName} value={to ?? ""} />}
    </div>
  );
}
