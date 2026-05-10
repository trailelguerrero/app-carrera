# INSTRUCCIONES DE TRABAJO — app-carrera

> **Este documento es la fuente única de verdad para trabajar sobre app-carrera.**
> Debe leerse **al inicio de cada conversación** antes de ejecutar cualquier tarea.

---

## Paso 0 — Lectura obligatoria al iniciar cada conversación

Lee estos cuatro archivos en orden antes de hacer cualquier otra cosa:

1. `INSTRUCCIONES.md` ← este archivo
2. `auditoria-contexto.md` — análisis técnico completo del sistema
3. `roadmap-referencia.md` — fases, tareas, criterios de aceptación y prompts de rol
4. `flujo-de-trabajo.md` — cómo ensamblar el contexto de cada tarea y protocolos especiales

---

## Paso 1 — Checklist de sesión (completar antes de escribir código)

Antes de empezar cualquier tarea, responde en voz alta estas 5 preguntas:

- [ ] ¿Tengo el **código ACTUAL** del archivo que voy a modificar (no el de la auditoría)?
- [ ] ¿He activado el **system prompt del rol** de la tarea ANTES que cualquier otra cosa?
- [ ] ¿He incluido **SOLO los archivos** que esta tarea toca, sin arrastrar contexto de otras?
- [ ] ¿He añadido la **instrucción de anclaje**?
- [ ] ¿Sé exactamente cuál es el **criterio de aceptación** y puedo verificarlo?

Si alguna respuesta es "no", no escribas código todavía.

---

## Paso 2 — Protocolo de ejecución

1. **Lee la sección 3 completa** (análisis por módulo) de `auditoria-contexto.md` para entender el contexto del código que vas a tocar.

2. **Localiza la tarea exacta en el roadmap** (`roadmap-referencia.md`), incluyendo archivos afectados y criterio de aceptación.

3. **Adopta el rol indicado en el prompt de rol de la tarea** antes de escribir código.

4. **Respeta el orden de fases:**
   - La **Fase 0** debe cerrarse antes de empezar cualquier refactor.
   - La **Fase 1** requiere backup de Neon antes del primer deploy.

5. **No modifiques el valor de ninguna clave `teg_...`** al refactorizar — solo el token en el código fuente, nunca el string value.

---

## Reglas generales de trabajo

- Cualquier cambio en componentes debe estar alineado con el análisis de módulo correspondiente.
- Antes de proponer código, verificar si ya existe una implementación relacionada en el codebase.
- Las migraciones de base de datos (Neon/PostgreSQL) siempre se documentan y se hace backup previo.
- Los cambios de arquitectura se consultan antes de implementar.

---

*Última actualización: 2026-05-10*
