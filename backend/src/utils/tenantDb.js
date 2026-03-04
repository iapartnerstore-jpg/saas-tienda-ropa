/**
 * Re-exporta el pool singleton de la core DB.
 * Todos los módulos que importan este archivo siguen funcionando
 * sin cambios, y ahora comparten UNA sola instancia de pool.
 */
import { getCorePool } from '../config/coreDb.js';

export default getCorePool();
