import { blockCls as cls } from "@/lib/blockStyles";
import { TabRecorridos } from "@/components/logistica/TabRecorridos";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { SeccionIdentidad }  from "@/components/configuracion/SeccionIdentidad";
import { SeccionBackup }     from "@/components/configuracion/SeccionBackup";
import { SeccionFormulario } from "@/components/configuracion/SeccionFormulario";
import { SeccionCamisetas }  from "@/components/configuracion/SeccionCamisetas";
import { SeccionPeligro }    from "@/components/configuracion/SeccionPeligro";
import { ModalImportPreview } from "@/components/configuracion/ModalImportPreview";
import { ModalReset }         from "@/components/configuracion/ModalReset";

export default function Configuracion() {
  const cfg = useConfiguracion();
  const {
    form, upd, dirty, saved,
    savedConfig, draft, setDraft,
    rawRecorridos, setRecorridos,
    importMsg, setImportMsg,
    importPreview, setImportPreview,
    qrDataUrl, setQrDataUrl, qrGenerando,
    resetModal, setResetModal,
    resetInput, setResetInput,
    imgFront, imgBack, imgGuia,
    imgPreviews, imgError, imgSaving,
    opcionPuesto, setOpcionPuesto,
    opcionVehiculo, setOpcionVehiculo,
    opcionEmail, setOpcionEmail,
    opcionEmergencia, setOpcionEmergencia,
    fechaEvento, diasRestantes, esConfigInicial,
    urlFormulario,
    handleSave, handleExport,
    handleExportVoluntariosCSV, handleExportPatrocinadores,
    handleImport, aplicarImport,
    handleImgFile, handleImgRemove,
    generarQR, handleReset,
    exportando,
  } = cfg;

  return (
    <>
      <div className="block-container">

        {/* Banner configuración inicial */}
        {esConfigInicial && (
          <div style={{ margin: "0 0 1rem 0", padding: "0.85rem 1.1rem", background: "var(--teg-amber-dim, rgba(251,191,36,0.08))", border: "1px solid var(--teg-amber-border, rgba(251,191,36,0.35))", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>⚙️</span>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--amber, #f59e0b)", marginBottom: "0.25rem" }}>Configura tu evento antes de empezar</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.5 }}>Rellena los campos obligatorios: <strong>nombre</strong>, <strong>fecha</strong> y <strong>lugar</strong>.</div>
            </div>
          </div>
        )}

        <div className="block-header">
          <div>
            <h1 className="block-title">⚙️ Configuración</h1>
            <div className="block-title-sub">
              {form.nombre} {form.edicion} · {form.lugar}
              {diasRestantes !== null && (
                <span style={{ marginLeft: ".75rem", color: diasRestantes <= 30 ? "var(--amber)" : "var(--text-dim)" }}>
                  · {diasRestantes > 0 ? `${diasRestantes} días` : "¡Hoy!"}
                </span>
              )}
            </div>
          </div>
          {dirty && (
            <div className="block-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Descartar</button>
              <button className="btn btn-primary" onClick={handleSave}>Guardar cambios</button>
            </div>
          )}
        </div>

        <SeccionIdentidad form={form} upd={upd} fechaEvento={fechaEvento} diasRestantes={diasRestantes} />

        <SeccionBackup
          exportando={exportando}
          importMsg={importMsg} setImportMsg={setImportMsg}
          handleExport={handleExport}
          handleExportVoluntariosCSV={handleExportVoluntariosCSV}
          handleExportPatrocinadores={handleExportPatrocinadores}
          handleImport={handleImport}
        />

        <SeccionFormulario
          form={form} upd={upd}
          urlFormulario={urlFormulario}
          qrDataUrl={qrDataUrl} setQrDataUrl={setQrDataUrl}
          qrGenerando={qrGenerando} generarQR={generarQR}
          opcionPuesto={opcionPuesto}         setOpcionPuesto={setOpcionPuesto}
          opcionVehiculo={opcionVehiculo}     setOpcionVehiculo={setOpcionVehiculo}
          opcionEmail={opcionEmail}           setOpcionEmail={setOpcionEmail}
          opcionEmergencia={opcionEmergencia} setOpcionEmergencia={setOpcionEmergencia}
        />

        <SeccionCamisetas
          imgFront={imgFront} imgBack={imgBack} imgGuia={imgGuia}
          imgPreviews={imgPreviews} imgError={imgError} imgSaving={imgSaving}
          handleImgFile={handleImgFile} handleImgRemove={handleImgRemove}
        />

        {/* Recorridos GPX */}
        <div className="card cfg-section">
          <div className="cfg-section-title">🗺️ Recorridos del evento</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Sube los archivos .gpx de cada modalidad. Se simplifican automáticamente y se muestran sobre el mapa de Logística y en el portal del voluntario.
          </div>
          <TabRecorridos
            recorridos={Array.isArray(rawRecorridos) ? rawRecorridos : []}
            setRecorridos={setRecorridos}
          />
        </div>

        {/* Seguridad de acceso */}
        <div className="card cfg-section">
          <div className="cfg-section-title">🔐 Seguridad de acceso</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: ".75rem", lineHeight: 1.6 }}>
            El panel de gestión está protegido por un PIN numérico. Cámbialo regularmente y no lo compartas con personas ajenas al equipo organizador.
          </div>
          <button className="backup-btn export" style={{ padding: ".45rem .9rem" }}
            onClick={() => window.dispatchEvent(new CustomEvent("teg-open-changepin"))}>
            🔑 Cambiar PIN de acceso
          </button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".6rem", lineHeight: 1.6 }}>
            ⚠️ El hash del PIN se almacena en este dispositivo. Para acceder desde otro dispositivo necesitarás el PIN actual o restaurar un backup.
          </div>
        </div>

        <SeccionPeligro
          form={form} upd={upd}
          savedConfig={savedConfig} draft={draft}
          setResetModal={setResetModal} setResetInput={setResetInput}
        />

        <div className="cfg-save-bar">
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span className="cfg-saved">✓ Cambios guardados</span>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-sm)" }}
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "dashboard" } }))}>
                ← Dashboard
              </button>
            </div>
          )}
          <button className={cls("btn", dirty ? "btn-primary" : "btn-ghost")}
            onClick={handleSave} disabled={!dirty} style={{ opacity: dirty ? 1 : .45 }}>
            {dirty ? "Guardar cambios" : "Sin cambios pendientes"}
          </button>
        </div>

      </div>

      <ModalImportPreview
        importPreview={importPreview}
        onCancel={() => setImportPreview(null)}
        onConfirm={aplicarImport}
      />

      <ModalReset
        resetModal={resetModal}
        resetInput={resetInput}
        setResetInput={setResetInput}
        onCancel={() => setResetModal(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
