# Historias de usuario - Frontend React

## HU-01: Iniciar sesión

Como bibliotecario, quiero iniciar sesión en la aplicación para acceder al panel de gestión.

Criterios de aceptación:

- El formulario solicita usuario y contraseña.
- La aplicación muestra errores claros si las credenciales no son válidas.
- La sesión se guarda localmente para reutilizar la experiencia.

## HU-02: Gestionar catálogo

Como bibliotecario, quiero consultar y administrar libros para mantener el inventario actualizado.

Criterios de aceptación:

- Se visualiza una lista paginada del catálogo.
- Se puede filtrar por texto y categoría.
- Se permiten operaciones de crear, editar y eliminar lógicamente.

## HU-03: Gestionar socios

Como bibliotecario, quiero registrar y consultar socios para controlar quién puede tomar libros prestados.

Criterios de aceptación:

- La interfaz presenta una tabla con socios y su estado.
- Se puede crear, editar o desactivar un socio.
- La app valida datos obligatorios y mensajes de error.

## HU-04: Registrar préstamos

Como bibliotecario, quiero registrar préstamos para dar en uso los ejemplares disponibles.

Criterios de aceptación:

- El formulario valida que existan ejemplares disponibles.
- Se registra la fecha del préstamo y el responsable.
- Se muestra un mensaje de éxito cuando la operación termina bien.

## HU-05: Registrar devoluciones

Como bibliotecario, quiero devolver un préstamo para cerrar el proceso y actualizar el estado del ejemplar.

Criterios de aceptación:

- Se puede registrar la devolución de uno o varios ejemplares.
- La app evita registrar la misma devolución dos veces.
- Se notifica si el préstamo está vencido o ya fue devuelto.

## HU-06: Consultar vencidos

Como bibliotecario, quiero ver los préstamos vencidos para mantener la biblioteca ordenada y atender morosidad.

Criterios de aceptación:

- Se muestra una vista consolidada con vencidos.
- Los registros se ordenan por fecha de vencimiento.
- La vista permite identificar el socio y el libro asociado.

## HU-07: Ver reporte de libros más prestados

Como administrador, quiero visualizar el reporte de más prestados para priorizar adquisiciones y planificación.

Criterios de aceptación:

- La pantalla carga el reporte desde la API.
- Se presentan datos de libro, cantidad prestada y rango consultado.
- La vista permanece accesible solo a perfiles administrativos.
