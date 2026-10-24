import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AdminLayout, SocioLayout } from "./components/Layouts";
import { AuthProvider, RequireUser, useAuth } from "./lib/auth";
import { Ajustes } from "./pages/admin/Ajustes";
import { Calendario } from "./pages/admin/Calendario";
import { ClaseEditar, Clases } from "./pages/admin/Clases";
import { Horario } from "./pages/admin/Horario";
import { Inicio } from "./pages/admin/Inicio";
import { SesionDetalle } from "./pages/admin/SesionDetalle";
import { Sesiones } from "./pages/admin/Sesiones";
import { SocioDetalle, Socios } from "./pages/admin/Socios";
import { Login } from "./pages/auth/Login";
import { NuevaContrasena } from "./pages/auth/NuevaContrasena";
import { Recuperar } from "./pages/auth/Recuperar";
import { Registro } from "./pages/auth/Registro";
import { Cambiar } from "./pages/socio/Cambiar";
import { Cuenta } from "./pages/socio/Cuenta";
import { HorarioSocio } from "./pages/socio/HorarioSocio";
import { MisClases } from "./pages/socio/MisClases";

function Home() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={profile ? (profile.role === "admin" ? "/admin" : "/socio") : "/login"} replace />;
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="recuperar" element={<Recuperar />} />
          <Route path="nueva-contrasena" element={<NuevaContrasena />} />
          <Route path="admin" element={<RequireUser admin><AdminLayout /></RequireUser>}>
            <Route index element={<Inicio />} />
            <Route path="sesiones" element={<Sesiones />} />
            <Route path="sesiones/:id" element={<SesionDetalle />} />
            <Route path="horario" element={<Horario />} />
            <Route path="clases" element={<Clases />} />
            <Route path="clases/:id" element={<ClaseEditar />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="socios" element={<Socios />} />
            <Route path="socios/:id" element={<SocioDetalle />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
          <Route path="socio" element={<RequireUser><SocioLayout /></RequireUser>}>
            <Route index element={<HorarioSocio />} />
            <Route path="mis-clases" element={<MisClases />} />
            <Route path="cambiar/:id" element={<Cambiar />} />
            <Route path="cuenta" element={<Cuenta />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
