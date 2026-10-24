import type { ReactNode } from "react";
import { addMonths, dayNumber, formatMonth, monthGrid, todayISO, WEEKDAY_LETTERS } from "../lib/dates";
import { Icon } from "./Brand";

type Props = {
  month: string; // cualquier día del mes que se muestra
  onMonthChange: (month: string) => void;
  renderDay?: (day: string) => ReactNode; // contenido de cada casilla, debajo del número
  onDayClick?: (day: string) => void;
  dayClass?: (day: string) => string; // clases extra de la casilla (marcar días cerrados, seleccionados…)
  isDisabled?: (day: string) => boolean;
  compact?: boolean; // casillas pequeñas, solo número (para elegir fechas)
  minMonth?: string;
  maxMonth?: string;
};

// Calendario mensual de lunes a domingo, con flechas para cambiar de mes.
export function MonthCalendar({ month, onMonthChange, renderDay, onDayClick, dayClass, isDisabled, compact, minMonth, maxMonth }: Props) {
  const today = todayISO();
  const current = month.slice(0, 7);
  const days = monthGrid(month);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold">{formatMonth(month)}</h3>
        <div className="flex gap-1.5">
          <button type="button" className="icon-btn" aria-label="Mes anterior" disabled={!!minMonth && prev.slice(0, 7) < minMonth.slice(0, 7)} onClick={() => onMonthChange(prev)}>
            <Icon name="left" />
          </button>
          <button type="button" className="icon-btn" aria-label="Mes siguiente" disabled={!!maxMonth && next.slice(0, 7) > maxMonth.slice(0, 7)} onClick={() => onMonthChange(next)}>
            <Icon name="right" />
          </button>
        </div>
      </div>
      <div className={`grid grid-cols-7 ${compact ? "gap-1" : "gap-1 sm:gap-1.5"}`}>
        {WEEKDAY_LETTERS.map((l) => (
          <div key={l} className="pb-1 text-center text-xs font-semibold text-muted">{l}</div>
        ))}
        {days.map((day) => {
          const inMonth = day.slice(0, 7) === current;
          const disabled = !inMonth || isDisabled?.(day);
          const Cell = onDayClick && !disabled ? "button" : "div";
          return (
            <Cell
              key={day}
              {...(Cell === "button" ? { type: "button" as const, onClick: () => onDayClick!(day) } : {})}
              aria-label={Cell === "button" ? day : undefined}
              className={`relative flex flex-col rounded-xl border text-left transition-colors ${
                compact ? "aspect-square items-center justify-center text-sm" : "min-h-16 p-1.5 sm:min-h-24 sm:p-2"
              } ${!inMonth ? "border-transparent opacity-0" : disabled ? "border-transparent text-faint" : "border-line bg-surface"} ${
                Cell === "button" ? "hover:border-ink" : ""
              } ${day === today && inMonth ? "ring-2 ring-sky ring-offset-1" : ""} ${inMonth ? dayClass?.(day) ?? "" : ""}`}
            >
              <span className={`font-semibold tabular-nums ${compact ? "" : "text-sm"}`}>{dayNumber(day)}</span>
              {inMonth && renderDay?.(day)}
            </Cell>
          );
        })}
      </div>
    </div>
  );
}
