/**
 * ENDPOINT TEMPORAL DE AUDITORÍA — BORRAR DESPUÉS DE USAR
 * Solo lectura. Requiere x-api-key. No modifica nada.
 */
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const LS_KEY = 'teg_voluntarios_v1_voluntarios';

function pinInicial(t) { return (t||'').replace(/\D/g,'').slice(-4)||'0000'; }
function hashPinLegacy(pin) {
  let h=0; for(let i=0;i<pin.length;i++) h=(Math.imul(31,h)+pin.charCodeAt(i))|0; return String(h);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  if (req.method==='OPTIONS') return res.status(204).end();
  if (req.headers['x-api-key'] !== process.env.API_KEY)
    return res.status(401).json({error:'Unauthorized'});

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
  const vols = rows[0]?.value || [];

  const resultado = vols.map(v => {
    const tel = v.telefono||'';
    const ph  = v.pinHash;
    const pp  = v.pinPersonalizado;
    const nombre = `${v.nombre||''}${v.apellidos?' '+v.apellidos:''}`.trim();

    let flagBD = pp===true?'true': pp===false?'FALSE_EXPLICITO':'undefined';

    let esPersonalizadoReal=false, metodo='';
    if (pp===true) { esPersonalizadoReal=true; metodo='flag=true'; }
    else if (!ph)  { esPersonalizadoReal=false; metodo='sin_hash'; }
    else if (ph.startsWith('$2')) {
      const esInicial = bcrypt.compareSync(pinInicial(tel), ph);
      esPersonalizadoReal=!esInicial;
      metodo = esInicial?'bcrypt=inicial':'bcrypt=CAMBIADO';
    } else {
      const esInicial = hashPinLegacy(pinInicial(tel))===ph;
      esPersonalizadoReal=!esInicial;
      metodo = esInicial?'djb2=inicial':'djb2=CAMBIADO';
    }

    let sesionActiva=false;
    if (v.sessionToken && v.sessionTokenExpiry) {
      const exp=new Date(v.sessionTokenExpiry);
      sesionActiva=!isNaN(exp.getTime())&&exp>new Date();
    }

    return {
      nombre, telefono: tel, estado: v.estado||'?',
      flagBD, esPersonalizadoReal, metodo, sesionActiva,
      bloqueado: pp===false,
      fechaRegistro: v.fechaRegistro||null,
      fuenteRegistro: v.fuenteRegistro||null,
    };
  });

  return res.status(200).json({
    total: vols.length,
    bloqueados: resultado.filter(r=>r.bloqueado).length,
    conPinPropio: resultado.filter(r=>r.esPersonalizadoReal).length,
    voluntarios: resultado,
  });
}
