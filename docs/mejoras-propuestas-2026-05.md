# Análisis y Mejoras Propuestas — Voluntarios + Portal del Voluntario
*Fecha: Mayo 2026*

---

## Estado Actual — Puntos Fuertes

- Portal de voluntario autónomo con registro, login PIN, ficha editable
- Checklist Día D con marcaje en tiempo real (enPuesto)
- Historial de cambios por voluntario
- Estado "ausente" para gestión de emergencias
- Material del puesto visible por el voluntario
- Mensaje del organizador → voluntario
- Auto-refresh cada 5 minutos
- Alergias y medicación para seguridad en carrera
- Exportación CSV por puesto y masiva

---

## Bugs Corregidos en Esta Sesión

1. **Pantalla negra "Ya soy voluntario"** — SyntheticEvent pasado como teléfono a goLogin
2. **Eliminación silenciosa** — `hasChanged` en dataService bloqueaba el guardado cuando el diff daba igual
3. **María Guzmán** — Eliminada directamente via endpoint admin de la DB

---

## Mejoras Prioritarias Propuestas

### P1 — Operacionales (alto impacto, día de evento)

**1. WhatsApp masivo al confirmar voluntarios**
Botón "📲 Enviar WhatsApp" en la ficha del voluntario que abra:
`https://wa.me/{tel}?text=Hola {nombre}, confirmamos tu participación como voluntario...`
También versión masiva en la toolbar de selección.

**2. Notificación push cuando el organizador cambia tu estado**
El voluntario no sabe que fue confirmado hasta que recarga. Un simple polling cada 2 minutos en el portal que compare `v.estado` con el guardado y muestre un banner "¡Has sido confirmado como voluntario!" sería suficiente sin backend extra.

**3. Mapa del puesto en el portal del voluntario**
Añadir campo `coordenadas` (lat/lng) al puesto y mostrar un enlace a Google Maps:
`https://maps.google.com/?q={lat},{lng}` en la ficha del voluntario.

**4. Instrucciones de llegada por puesto**
Campo `instruccionesLlegada` en el puesto (distinto de `notas`) visible en el portal del voluntario con indicaciones específicas de cómo llegar.

**5. QR personal del voluntario**
Cada voluntario tiene un QR único (con su ID) que el organizador puede escanear en el TabDiaD para marcar presencia sin buscar en la lista. Útil con 150 voluntarios.

---

### P2 — Gestión del Organizador

**6. Grupos de puestos (tipos)**
Vista agrupada en TabPuestos por tipo (Avituallamiento / Control / Seguridad...) con collapse por grupo y cobertura agregada por tipo. Ya existe en el código pero el toggle está incompleto.

**7. Plantillas de puestos**
Guardar un puesto como plantilla y duplicarlo. Útil si los avituallamientos tienen todos el mismo horario y materiales.

**8. Asignación masiva de puestos**
En la toolbar de selección masiva: "Asignar a puesto" que abra un modal con selector de puesto enriquecido.

**9. Histórico de ediciones del organizador**
El historial actual solo registra cambios del sistema. Añadir `actor: "organizador" | "voluntario"` para saber quién hizo cada cambio.

**10. Exportación por puesto en PDF**
Lista imprimible para el responsable de cada puesto con los voluntarios, sus teléfonos y horario. Útil para el día de carrera sin necesidad de móvil.

---

### P3 — Portal del Voluntario (UX)

**11. Cambio de idioma (ES/EN)**
Muchos voluntarios internacionales en carreras de montaña. Un selector de idioma en el topbar con i18n mínimo (solo el portal).

**12. Confirmación explícita de participación**
Añadir un botón "✅ Confirmo mi asistencia" que el voluntario pulse (distinto del estado confirmado que pone el organizador). Permite al organizador saber quién ha visto y aceptado explícitamente su participación.

**13. Foto del voluntario (avatar)**
Campo opcional en la ficha del voluntario para subir una foto. En el TabDiaD el organizador ve las caras, más fácil de identificar. Almacenable en Vercel Blob.

**14. Modo oscuro/claro en el portal**
El portal actual siempre es dark. Añadir un toggle que guarde la preferencia en localStorage.

**15. Compartir ficha por enlace**
Un enlace único y seguro `?token=xxx` que el voluntario pueda compartir con su familia para que vean su puesto y horario (sin acceso a edición).

---

### P4 — Seguridad y Datos

**16. Campos médicos más completos**
- Grupo sanguíneo (A+, B-, O+, AB+, etc.) — crítico para emergencias graves
- Enfermedades crónicas relevantes (diabetes, epilepsia, hipertensión)
- ¿Tiene certificado de primeros auxilios? (checkbox)
- Contacto de emergencia (nombre + tel) — separado del teléfono de contacto

**17. Firma digital del reglamento**
Checkbox "He leído y acepto el reglamento del evento" con timestamp y versión del reglamento. Almacenable como `reglamentoAceptado: { fecha, version }`.

**18. Expiración automática de cuentas**
Voluntarios con estado "cancelado" desde hace más de X días deberían poder archivarse (no eliminarse) para mantener histórico pero limpiar la vista activa.

---

### P5 — Integraciones Futuras

**19. Email automático de bienvenida**
Tras el registro, enviar un email con el resumen y las instrucciones de acceso al portal. Implementable con Resend (serverless, gratis hasta 3.000 emails/mes).

**20. Integración con Google Calendar**
Botón "Añadir a mi agenda" que genere un `.ics` con la fecha, hora y lugar del puesto del voluntario.

**21. Tablero en tiempo real para el organizador (Día D)**
Un mapa con los puestos en tiempo real mostrando cuáles tienen todos los voluntarios marcados (verde), parcialmente (ámbar) o sin ninguno (rojo). Requiere un ligero polling o WebSocket.

---

## Deuda Técnica

| Item | Severidad | Descripción |
|------|-----------|-------------|
| CSS portal inline | Media | ~200 líneas CSS en constante — dificulta mantenimiento |
| Integración Logística por nombre | Alta | `a.puesto === loc.nombre` frágil — ya tiene fallback pero debería migrarse a ID |
| Sin tests | Alta | 0% cobertura — cualquier refactor puede romper flujos críticos |
| PIN inicial predecible | Media | Los últimos 4 dígitos del tel son públicos — forzar cambio en primer login |

