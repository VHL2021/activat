export type Member = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "member";
  active: boolean;
};

export function MemberFields({ value }: { value?: Member }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="name">Nombre y apellidos</label>
        <input className="input" id="name" name="name" required defaultValue={value?.name} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email (es su usuario)</label>
        <input className="input" id="email" name="email" type="email" required defaultValue={value?.email} />
      </div>
      <div>
        <label className="label" htmlFor="phone">Teléfono</label>
        <input className="input" id="phone" name="phone" type="tel" defaultValue={value?.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="role">Perfil</label>
        <select className="input" id="role" name="role" defaultValue={value?.role ?? "member"}>
          <option value="member">Socio</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
    </>
  );
}
