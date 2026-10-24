// Pruebas de permisos y reglas contra el Supabase local.
import { createClient } from "@supabase/supabase-js";
const URL = "http://127.0.0.1:54321";
const ANON = process.env.ANON, SERVICE = process.env.SERVICE;
const check = (c, m) => { if (!c) { console.error("FALLO:", m); process.exit(1); } console.log("ok -", m); };
const service = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function user(email, password = "clave-segura-1") {
  await service.auth.admin.createUser({ email, password, email_confirm: true });
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const signup = await anon.auth.signUp({ email: "intruso@ejemplo.com", password: "clave-segura-1" });
check(!!signup.error, "no se puede crear cuenta con un email no dado de alta");
check((await anon.from("profiles").select()).data?.length === 0 || !!(await anon.from("profiles").select()).error, "anónimo no ve perfiles");

const admin = await user("admin@ejemplo.com");
const laura = await user("laura@ejemplo.com");
const jorge = await user("jorge@ejemplo.com");

check((await laura.from("profiles").select()).data.length === 1, "un socio solo ve su perfil");
check((await admin.from("profiles").select()).data.length === 3, "el admin ve todos los perfiles");
const upd = await laura.from("profiles").update({ role: "admin" }).eq("email", "laura@ejemplo.com").select();
check(upd.data?.length === 0, "un socio no puede hacerse admin");
check(!!(await laura.from("settings").update({ max_per_day: 9 }).eq("id", true).select()).data?.length === false, "un socio no cambia ajustes");
check(!!(await laura.rpc("admin_set_capacity", { p_session_id: 1, p_capacity: 99 })).error, "un socio no usa funciones de admin");
check(!!(await laura.rpc("promote_waitlist", { p_session_id: 1 })).error, "funciones internas no accesibles");
check(!!(await laura.from("bookings").insert({ session_id: 1, user_id: (await laura.auth.getUser()).data.user.id, status: "booked" })).error, "no se puede reservar saltándose las reglas");

check(!(await laura.rpc("update_my_phone", { p_phone: "600000000" })).error, "un socio cambia su teléfono");
check(!(await laura.rpc("update_my_avatar", { p_avatar: "data:image/jpeg;base64,AAAA" })).error, "un socio pone su foto");
check(!!(await laura.rpc("update_my_avatar", { p_avatar: "javascript:alert(1)" })).error, "solo se aceptan fotos JPEG");
check((await laura.from("profiles").select("avatar").single()).data.avatar.startsWith("data:image/jpeg"), "la foto se guarda en su perfil");
check((await jorge.from("profiles").select("avatar")).data.every((p) => !p.avatar), "otro socio no ve esa foto");

const today = new Date().toISOString().slice(0, 10);
const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
await laura.rpc("ensure_sessions", { p_from: today, p_to: in7 });
const { data: sessions } = await laura.rpc("member_sessions", { p_from: today, p_to: in7 });
check(sessions.length > 3, `el socio ve ${sessions.length} sesiones`);
const later = sessions.filter((s) => s.minutes_until > 24 * 60);
const byDay = {};
for (const s of later) (byDay[s.day] ??= []).push(s);
const twoSameDay = Object.values(byDay).find((l) => l.length >= 2);
const [a, b] = twoSameDay;

check((await laura.rpc("book_session", { p_session_id: a.id })).data === "booked", "reserva");
const dup = await laura.rpc("book_session", { p_session_id: b.id });
check(dup.error?.message.includes("Ya tienes una clase ese día"), "límite por día: " + dup.error?.message);
check((await laura.from("bookings").select()).data.length === 1, "el socio ve solo sus reservas");
check((await jorge.from("bookings").select()).data.length === 0, "otro socio no ve reservas ajenas");

// Aforo 1: Jorge a lista de espera, Laura se cambia → Jorge sube
await admin.rpc("admin_set_capacity", { p_session_id: a.id, p_capacity: 1 });
check((await jorge.rpc("book_session", { p_session_id: a.id })).data === "waitlist", "lista de espera");
const sw = await laura.rpc("switch_booking", { p_from: a.id, p_to: b.id });
check(sw.data === "booked", "cambio de clase " + (sw.error?.message ?? ""));
const jb = (await jorge.from("bookings").select("status").eq("session_id", a.id)).data[0];
check(jb.status === "booked", "el de la lista de espera sube al liberarse la plaza");

// Cambio a una clase llena no pierde la plaza original
await admin.rpc("admin_set_capacity", { p_session_id: b.id, p_capacity: 1 });
const sw2 = await jorge.rpc("switch_booking", { p_from: a.id, p_to: b.id });
check(!!sw2.error && (await jorge.from("bookings").select("status").eq("session_id", a.id)).data[0].status === "booked", "cambio fallido no pierde la plaza");

// Plazo para desapuntarse
await admin.from("settings").update({ cancel_deadline_minutes: 100000 }).eq("id", true);
const late = await laura.rpc("cancel_booking", { p_session_id: b.id });
check(late.error?.message.includes("Solo puedes desapuntarte"), "plazo para desapuntarse");
await admin.from("settings").update({ cancel_deadline_minutes: 120 }).eq("id", true);

// Día cerrado cancela sesiones
const res = await admin.rpc("admin_add_closed_days", { p_from: b.day, p_to: b.day, p_kind: "festivo", p_reason: "Prueba" });
check(res.data?.sessions >= 1, "día cerrado cancela sesiones");
await admin.rpc("admin_delete_closed_day", { p_id: (await admin.from("closed_days").select("id")).data[0].id });
check((await admin.from("sessions").select("cancelled").eq("id", b.id)).data[0].cancelled === false, "quitar el día cerrado reabre las sesiones");

// Admin no se desactiva a sí mismo; desactivar socio le quita acceso
const adminId = (await admin.auth.getUser()).data.user.id;
check(!!(await admin.from("profiles").update({ active: false }).eq("id", adminId)).error, "el admin no se desactiva a sí mismo");
const jorgeId = (await jorge.auth.getUser()).data.user.id;
await admin.from("profiles").update({ active: false }).eq("id", jorgeId);
check((await jorge.from("class_types").select()).data.length === 0, "socio desactivado no ve nada");
check(!!(await jorge.rpc("book_session", { p_session_id: a.id })).error, "socio desactivado no reserva");

// Borrado de cuenta
check(!(await admin.rpc("admin_delete_member", { p_user_id: jorgeId })).error, "admin borra una cuenta");
check((await admin.from("profiles").select()).data.length === 2, "cuenta borrada");
check(Object.keys((await laura.rpc("my_data")).data).join() === "datos,reservas", "descarga de datos");
console.log("TODO OK");
