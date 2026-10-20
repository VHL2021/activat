import { NextResponse, type NextRequest } from "next/server";

// Comprobación rápida: sin cookie de sesión no se entra en las zonas privadas.
// La comprobación real (usuario activo y su perfil) se hace en cada página y acción.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("gym_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/socio/:path*"],
};
