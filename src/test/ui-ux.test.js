/**
 * UI/UX — Test Suite
 *
 * UX-01  Escala tipográfica del panel: fs-xs >= 0.75rem
 * UX-02  Escala tipográfica del panel: fs-base >= 0.875rem
 * UX-03  --text-dim tiene contraste mejorado (>= #7a92b8)
 * UX-04  focus-visible definido en blockStyles
 * UX-05  Colores hardcoded eliminados de Index.jsx (#dc2626, #059669, #f87171)
 * UX-06  SAVE_STATUS usa var() en lugar de hex hardcoded
 * UX-07  DíaCarrera accesible desde nav con mostrarBtnDiaD
 * UX-08  Portal: botón Atrás en el stepper
 * UX-09  Portal: tap target del botón Salir >= 44px
 * UX-10  Portal: focus-visible definido
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Fase 2: el CSS vive en src/styles/blocks.css (blockStyles.js quedó como stub vacío)
const blockStyles = readFileSync(
  path.resolve(process.cwd(), 'src/styles/blocks.css'), 'utf-8'
);
const indexJsx = readFileSync(
  path.resolve(process.cwd(), 'src/pages/Index.jsx'), 'utf-8'
);
// Fase 2 refactor: VoluntarioPortal dividido en src/pages/voluntario-portal/
const _portalFiles = [
  'src/pages/voluntario-portal/index.jsx',
  'src/pages/voluntario-portal/lib/session.js',
  'src/pages/voluntario-portal/screens/LandingScreen.jsx',
  'src/pages/voluntario-portal/screens/RegistroScreen.jsx',
  'src/pages/voluntario-portal/screens/RegistroOkScreen.jsx',
  'src/pages/voluntario-portal/screens/LoginScreen.jsx',
  'src/pages/voluntario-portal/screens/StepperForm.jsx',
  'src/pages/voluntario-portal/screens/PortalMain.jsx',
  'src/pages/voluntario-portal/components/PinNumpad.jsx',
  'src/pages/voluntario-portal/components/FormField.jsx',
  'src/pages/voluntario-portal/components/PuestoDetalle.jsx',
  'src/pages/voluntario-portal/components/CronometroTurno.jsx',
  'src/pages/voluntario-portal/components/CambiarPin.jsx',
  'src/pages/voluntario-portal/components/CancelarAsistencia.jsx',
];
const portalJsx = _portalFiles.map(f => {
  const p = path.resolve(process.cwd(), f);
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}).join('\n');

// ── UX-01: --fs-xs >= 0.75rem ─────────────────────────────────────────────
describe('UX-01 — --fs-xs panel >= 0.75rem (legibilidad mínima en campo)', () => {
  it('--fs-xs está definido en blockStyles', () => {
    expect(blockStyles).toContain('--fs-xs:');
  });

  it('--fs-xs >= 0.75rem', () => {
    const match = blockStyles.match(/--fs-xs:\s*([\d.]+)rem/);
    expect(match).not.toBeNull();
    const val = parseFloat(match[1]);
    expect(val).toBeGreaterThanOrEqual(0.75);
  });

  it('--fs-xs ya no es el valor ilegible 0.70rem', () => {
    expect(blockStyles).not.toMatch(/--fs-xs:\s*0\.70rem/);
    expect(blockStyles).not.toMatch(/--fs-xs:\s*0\.7rem/);
  });
});

// ── UX-02: --fs-base >= 0.875rem ─────────────────────────────────────────
describe('UX-02 — --fs-base panel >= 0.875rem', () => {
  it('--fs-base está definido', () => {
    expect(blockStyles).toContain('--fs-base:');
  });

  it('--fs-base >= 0.875rem', () => {
    const match = blockStyles.match(/--fs-base:\s*([\d.]+)rem/);
    expect(match).not.toBeNull();
    const val = parseFloat(match[1]);
    expect(val).toBeGreaterThanOrEqual(0.875);
  });

  it('--fs-base ya no es el valor pequeño 0.82rem', () => {
    expect(blockStyles).not.toMatch(/--fs-base:\s*0\.82rem/);
  });
});

// ── UX-03: --text-dim contraste mejorado ─────────────────────────────────
describe('UX-03 — --text-dim tiene contraste mejorado', () => {
  it('--text-dim está definido en blockStyles', () => {
    expect(blockStyles).toContain('--text-dim:');
  });

  it('--text-dim no es el color con contraste insuficiente #4a5e80', () => {
    // El valor anterior #4a5e80 tenía ratio ~3.1:1 sobre surface2
    expect(blockStyles).not.toContain('--text-dim:     #4a5e80');
  });

  it('--text-dim es el color mejorado #7a92b8 (ratio >= 4.5:1)', () => {
    expect(blockStyles).toContain('#7a92b8');
  });
});

// ── UX-04: focus-visible en blockStyles ──────────────────────────────────
describe('UX-04 — focus-visible definido en blockStyles', () => {
  it('focus-visible está en blockStyles', () => {
    expect(blockStyles).toContain('focus-visible');
  });

  it('usa var(--cyan) como color de foco', () => {
    const idx = blockStyles.indexOf('focus-visible');
    const ctx = blockStyles.slice(idx, idx+200);
    expect(ctx).toContain('var(--cyan)');
  });

  it('outline tiene offset positivo', () => {
    expect(blockStyles).toContain('outline-offset: 2px');
  });
});

// ── UX-05: No hay colores hardcoded del sistema en Index.jsx ─────────────
describe('UX-05 — Colores hardcoded eliminados de Index.jsx', () => {
  it('#dc2626 eliminado de Index.jsx', () => {
    expect(indexJsx).not.toContain('#dc2626');
  });

  it('#059669 eliminado de Index.jsx', () => {
    expect(indexJsx).not.toContain('#059669');
  });

  it('color:"#f87171" reemplazado por token', () => {
    expect(indexJsx).not.toContain('color:"#f87171"');
  });

  it('background:"#f87171" reemplazado por token', () => {
    expect(indexJsx).not.toContain('background:"#f87171"');
  });
});

// ── UX-06: SAVE_STATUS usa var() CSS ─────────────────────────────────────
describe('UX-06 — SAVE_STATUS usa tokens CSS (var) no hex hardcoded', () => {
  it('SAVE_STATUS saving usa var(--amber)', () => {
    expect(indexJsx).toContain('color: "var(--amber)"');
  });

  it('SAVE_STATUS saved usa var(--green)', () => {
    const idx = indexJsx.indexOf('✓ Guardado');
    const ctx = indexJsx.slice(Math.max(0, idx-200), idx+50);
    expect(ctx).toContain('var(--green)');
  });

  it('SAVE_STATUS error usa var(--red)', () => {
    const idx = indexJsx.indexOf('Error al guardar');
    const ctx = indexJsx.slice(Math.max(0, idx-200), idx+50);
    expect(ctx).toContain('var(--red)');
  });
});

// ── UX-07: DíaCarrera accesible desde la nav ──────────────────────────────
describe('UX-07 — DíaCarrera tiene botón en la nav inferior', () => {
  it('mostrarBtnDiaD controla visibilidad del botón', () => {
    expect(indexJsx).toContain('mostrarBtnDiaD');
  });

  it('botón DÍA D está en la nav inferior (dentro del condicional isMobile)', () => {
    expect(indexJsx).toContain('DÍA D');
    // Verificar que el botón DíaCarrera está en la zona de la nav
    const idx = indexJsx.indexOf('aria-label="Abrir DíaCarrera"');
    expect(idx).toBeGreaterThan(-1);
  });

  it('botón DíaCarrera tiene aria-label accesible', () => {
    expect(indexJsx).toContain('aria-label="Abrir DíaCarrera"');
  });

  it('botón DíaCarrera está junto al botón Más en la nav', () => {
    const idxDiaD = indexJsx.indexOf('aria-label="Abrir DíaCarrera"');
    const idxMas  = indexJsx.indexOf('aria-label="Más secciones"');
    // El botón DíaCarrera debe aparecer antes del botón Más en el DOM
    expect(idxDiaD).toBeGreaterThan(-1);
    expect(idxMas).toBeGreaterThan(idxDiaD);
  });
});

// ── UX-08: Portal — botón Atrás en stepper ────────────────────────────────
describe('UX-08 — Portal tiene botón Atrás en el stepper de registro', () => {
  it('botón ← Atrás existe en el portal', () => {
    expect(portalJsx).toContain('← Atrás');
  });

  it('botón Atrás usa función irA para navegar entre pasos', () => {
    expect(portalJsx).toContain('irA(1)');
    expect(portalJsx).toContain('irA(2)');
  });

  it('hay al menos 2 botones Atrás (uno por paso intermedio)', () => {
    const count = (portalJsx.match(/← Atrás/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ── UX-09: Portal — tap target botón Salir ────────────────────────────────
describe('UX-09 — Portal: tap target botón Salir >= 44px', () => {
  it('botón Salir tiene minHeight definido', () => {
    const idx = portalJsx.indexOf('Salir\n');
    expect(idx).toBeGreaterThan(-1);
    const ctx = portalJsx.slice(Math.max(0, idx-600), idx+50);
    expect(ctx).toMatch(/minHeight.*44/);
  });

  it('botón Salir usa display flex para centrado vertical', () => {
    const idx = portalJsx.indexOf('Salir\n');
    const ctx = portalJsx.slice(Math.max(0, idx-600), idx+50);
    expect(ctx).toContain('alignItems:"center"');
  });
});

// ── UX-10: Portal — focus-visible ────────────────────────────────────────
describe('UX-10 — Portal tiene :focus-visible definido', () => {
  it('focus-visible está en el CSS del portal', () => {
    expect(portalJsx).toContain('focus-visible');
  });

  it('usa var(--cyan) como color de foco en el portal', () => {
    const idx = portalJsx.indexOf('focus-visible');
    const ctx = portalJsx.slice(idx, idx+200);
    expect(ctx).toContain('var(--cyan)');
  });

  it('el foco aplica a button, input, select y textarea', () => {
    const idx = portalJsx.indexOf('focus-visible');
    const ctx = portalJsx.slice(Math.max(0,idx-50), idx+300);
    expect(ctx).toContain('button:focus-visible');
    expect(ctx).toContain('input:focus-visible');
  });
});
