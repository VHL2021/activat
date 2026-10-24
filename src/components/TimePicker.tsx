import { useState } from "react";

// Elegir la hora: botones con las horas habituales (Ajustes del horario) y un campo para otra hora.
export function TimePicker({ name, slots = [] }: { name: string; slots?: string[] }) {
  const [value, setValue] = useState("");
  const custom = value !== "" && !slots.includes(value);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Hora">
        {slots.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={value === t} onClick={() => setValue(t)}
            className={`chip tabular-nums ${value === t ? "chip-on" : ""}`}>
            {t}
          </button>
        ))}
        <input
          type="time"
          aria-label="Otra hora"
          className={`chip w-32 tabular-nums ${custom ? "chip-on" : ""}`}
          value={custom ? value : ""}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
