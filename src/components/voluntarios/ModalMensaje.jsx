// [VOL-03] Generador de mensaje de instrucciones para voluntarios
// Tres formatos: WhatsApp (emojis), Email (formal), Texto plano
// El organizador puede editar el texto antes de copiar
import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";

const FORMATOS = [
  { id: "whatsapp", label: "📱 WhatsApp", icon: "📱" },
  { id: "email",    label: "✉️ Email",    icon: "✉️" },
  { id: "plano",    label: "📄 Texto",    icon: "📄" },
];

function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  try {
    return new Date(fechaISO).toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return fechaISO;
  }
}

function generarTexto(formato, config, portalUrl) {
  const nombre   = config?.nombre || "Trail El Guerrero";
  const fecha    = formatearFecha(config?.fecha);
  const contacto = (config?.organizadores || []).map(o =>
    [o.nombre, o.telefono].filter(Boolean).join(" · ")
  ).join("\n") || "contacta con la organización";

  if (formato === "whatsapp") {
    return `👋 *Hola, voluntario/a del ${nombre}!*

📅 *Fecha del evento:* ${fecha}
📍 *Tu puesto y horario* están disponibles en tu ficha personal.

🔗 *Accede a tu ficha aquí:*
${portalUrl}

🔑 *PIN de acceso:* los últimos 4 dígitos de tu teléfono
_(Cámbialo desde tu ficha si lo deseas)_

ℹ️ Ahí encontrarás toda la información: puesto, horarios, talla de camiseta y contacto del equipo.

📞 *Contacto organización:*
${contacto}

¡Muchas gracias por tu colaboración! 🙌`;
  }

  if (formato === "email") {
    return `Asunto: Instrucciones para voluntarios — ${nombre}

Estimado/a voluntario/a,

Gracias por inscribirte como voluntario/a en el ${nombre}, que se celebrará el ${fecha}.

Para consultar tu puesto asignado, horario y demás información, accede a tu ficha personal en el siguiente enlace:

  ${portalUrl}

Tu PIN de acceso son los últimos 4 dígitos de tu número de teléfono. Puedes cambiarlo una vez dentro de la aplicación.

En caso de cualquier duda o incidencia, no dudes en ponerte en contacto con el equipo organizador:
${contacto}

Gracias de nuevo por tu apoyo. ¡Nos vemos el día de la carrera!

Un saludo,
El equipo organizador de ${nombre}`;
  }

  // Texto plano
  return `Voluntarios ${nombre} — ${fecha}

Accede a tu ficha: ${portalUrl}
PIN: últimos 4 dígitos de tu teléfono

Puesto y horario disponibles en tu ficha.

Contacto organización: ${contacto}`;
}

export function ModalMensaje({ onClose, config }) {
  const portalUrl = (typeof window !== "undefined" ? window.location.origin : "") + "/voluntarios/mi-ficha";
  const [formato, setFormato]   = useState("whatsapp");
  const [texto, setTexto]       = useState("");
  const [copiado, setCopiado]   = useState(false);

  // Regenerar texto al cambiar formato
  useEffect(() => {
    setTexto(generarTexto(formato, config, portalUrl));
    setCopiado(false);
  }, [formato]); // eslint-disable-line react-hooks/exhaustive-deps

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      toast("✅ Copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => {
      toast("❌ No se pudo copiar — copia el texto manualmente");
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        width: "100%", maxWidth: 560,
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,.4)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: ".85rem 1rem .75rem",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>📨 Mensaje de instrucciones</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>
              Copia y pega en tu canal de comunicación con los voluntarios
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-dim)", fontSize: "1.1rem", padding: ".2rem .4rem",
              borderRadius: 6, lineHeight: 1,
            }}
            aria-label="Cerrar"
          >✕</button>
        </div>

        {/* Selector de formato */}
        <div style={{
          display: "flex", gap: ".4rem",
          padding: ".75rem 1rem .5rem",
          flexShrink: 0,
        }}>
          {FORMATOS.map(f => (
            <button
              key={f.id}
              onClick={() => setFormato(f.id)}
              style={{
                flex: 1, padding: ".4rem .5rem",
                borderRadius: 8, border: "1px solid",
                borderColor: formato === f.id ? "var(--cyan)" : "var(--border)",
                background: formato === f.id ? "var(--cyan-dim)" : "var(--surface)",
                color: formato === f.id ? "var(--cyan)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                fontWeight: 700, cursor: "pointer",
                transition: "all .12s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Área de texto editable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem .5rem" }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            style={{
              width: "100%", minHeight: 260,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontFamily: formato === "whatsapp" ? "var(--font-mono)" : "inherit",
              fontSize: "var(--fs-sm)",
              lineHeight: 1.6,
              padding: ".75rem",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            spellCheck={false}
          />
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", marginTop: ".3rem",
          }}>
            Puedes editar el texto antes de copiar.
          </div>
        </div>

        {/* Footer con botón copiar */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: ".6rem",
          padding: ".75rem 1rem .85rem",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button
            className={`btn ${copiado ? "btn-green" : "btn-primary"}`}
            onClick={copiar}
            style={{ minWidth: 130 }}
          >
            {copiado ? "✓ Copiado" : "📋 Copiar mensaje"}
          </button>
        </div>
      </div>
    </div>
  );
}
