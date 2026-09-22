"""Punto de entrada de la API."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config import get_settings
from src.features.auth.api import router as auth_router
from src.features.orders.api import router as orders_router

settings = get_settings()

app = FastAPI(title="MyTrueque.com API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Holgura para las cabeceras del multipart (nombre de archivo, boundary, tipo MIME por
# cada parte). 1 MiB cubre de sobra una orden con muchos archivos.
_HOLGURA_MULTIPART = 1024 * 1024


@app.middleware("http")
async def limitar_tamano_de_subida(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Rechaza por `Content-Length` ANTES de leer el cuerpo.

    🔴 No es redundante con el tope que valida el servicio: Starlette parsea el multipart
    ENTERO a un archivo temporal antes de invocar el endpoint, así que para cuando el
    servicio puede mirar `UploadFile.size` los bytes YA están escritos en disco. Medido:
    con el tope en 1 KB, un cuerpo de 20 MB tardaba 3,1 s en ser rechazado — el servidor
    lo había leído entero. En un EC2 con ~3 GB libres eso llena el disco igual que si se
    hubiera aceptado.

    En producción conviene además `client_max_body_size` en nginx, que corta aún antes.
    """
    if request.method == "POST" and request.url.path.rstrip("/") == "/orders":
        declarado = request.headers.get("content-length")
        if declarado is not None and declarado.isdigit():
            # `get_settings()` aquí dentro y NO la variable de módulo: si alguien invalida
            # la caché de ajustes (los tests lo hacen), la de módulo se queda con valores
            # viejos y el middleware deja pasar lo que el servicio sí rechaza.
            maximo = get_settings().max_order_bytes
            if int(declarado) > maximo + _HOLGURA_MULTIPART:
                return JSONResponse(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={"detail": "La orden pesa más de 1 GB. Quita algún archivo."},
                )
    return await call_next(request)


app.include_router(auth_router)
app.include_router(orders_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
