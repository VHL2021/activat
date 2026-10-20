export type ClassType = {
  id: number;
  name: string;
  description: string | null;
  instructor: string | null;
  duration_min: number;
  capacity: number;
  active: boolean;
};

export function ClassFields({ value, defaultCapacity }: { value?: ClassType; defaultCapacity: number }) {
  return (
    <>
      <div className="md:col-span-2">
        <label className="label" htmlFor="name">Nombre</label>
        <input className="input" id="name" name="name" required defaultValue={value?.name} placeholder="Ej.: Spinning" />
      </div>
      <div>
        <label className="label" htmlFor="instructor">Monitor</label>
        <input className="input" id="instructor" name="instructor" defaultValue={value?.instructor ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="duration_min">Duración (minutos)</label>
        <input className="input" id="duration_min" name="duration_min" type="number" min={5} step={5} required defaultValue={value?.duration_min ?? 60} />
      </div>
      <div>
        <label className="label" htmlFor="capacity">Aforo máximo (personas)</label>
        <input className="input" id="capacity" name="capacity" type="number" min={1} required defaultValue={value?.capacity ?? defaultCapacity} />
      </div>
      <div className="md:col-span-3">
        <label className="label" htmlFor="description">Descripción</label>
        <input className="input" id="description" name="description" defaultValue={value?.description ?? ""} />
      </div>
    </>
  );
}
