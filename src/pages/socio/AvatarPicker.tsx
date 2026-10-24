import { useRef, useState } from "react";
import { Avatar, Icon } from "../../components/Brand";
import { useAuth } from "../../lib/auth";
import { rpc } from "../../lib/supabase";

// Recorta la foto en cuadrado y la reduce a 256 px (unos 20 KB) antes de guardarla.
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function AvatarPicker() {
  const { profile, refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ pending?: boolean; error?: string }>({});
  if (!profile) return null;

  async function save(avatar: string | null) {
    setState({ pending: true });
    try {
      await rpc("update_my_avatar", { p_avatar: avatar ?? "" });
      await refreshProfile();
      setState({});
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="flex items-center gap-5">
      <button type="button" className="group relative rounded-full" onClick={() => input.current?.click()} aria-label="Cambiar la foto">
        <Avatar name={profile.name} src={profile.avatar} className="size-24 text-2xl" />
        <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-surface bg-ink text-white group-hover:bg-sky-deep">
          <Icon name="camera" />
        </span>
      </button>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{profile.name}</p>
        <p className="text-sm text-muted">{profile.email}</p>
        <div className="flex flex-wrap gap-x-4 pt-1 text-sm font-medium">
          <button type="button" className="link" disabled={state.pending} onClick={() => input.current?.click()}>
            {profile.avatar ? "Cambiar la foto" : "Poner una foto"}
          </button>
          {profile.avatar && <button type="button" className="text-muted hover:text-danger" disabled={state.pending} onClick={() => save(null)}>Quitar</button>}
        </div>
        {state.pending && <p className="text-xs text-muted">Guardando…</p>}
        {state.error && <p className="text-xs text-danger" role="alert">{state.error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            await save(await shrink(file));
          } catch {
            setState({ error: "No se ha podido leer la imagen. Prueba con una foto JPG o PNG." });
          }
        }}
      />
    </div>
  );
}
