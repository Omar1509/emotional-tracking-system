// frontend/src/utils/emocionesHelper.js
// ✅ HELPER PARA CONVERTIR EMOCIONES Y MOSTRARLAS CORRECTAMENTE

export const EMOCIONES_MAP = {
  // Emociones principales
  'alegria': {
    texto: 'Alegría',
    emoji: '😊',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500'
  },
  'tristeza': {
    texto: 'Tristeza',
    emoji: '😢',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500'
  },
  'ansiedad': {
    texto: 'Ansiedad',
    emoji: '😰',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500'
  },
  'enojo': {
    texto: 'Enojo',
    emoji: '😠',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500'
  },
  'miedo': {
    texto: 'Miedo',
    emoji: '😨',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500'
  },
  'sorpresa': {
    texto: 'Sorpresa',
    emoji: '😲',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-500'
  },
  'calma': {
    texto: 'Calma',
    emoji: '😌',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-500'
  },
  'frustración': {
    texto: 'Frustración',
    emoji: '😤',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-500'
  },
  'neutral': {
    texto: 'Neutral',
    emoji: '😐',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500'
  }
};

/**
 * Obtiene la información de una emoción
 * @param {string} emocion - Nombre de la emoción (puede ser en minúsculas o con tildes)
 * @returns {object} - Objeto con texto, emoji, color, etc.
 */
export const obtenerInfoEmocion = (emocion) => {
  if (!emocion) {
    return EMOCIONES_MAP['neutral'];
  }

  // Normalizar: convertir a minúsculas y quitar tildes
  const emocionNormalizada = emocion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Quitar acentos

  // Buscar en el mapa
  return EMOCIONES_MAP[emocionNormalizada] || EMOCIONES_MAP['neutral'];
};

/**
 * Obtiene el color según el nivel de ánimo (1-10)
 * @param {number} nivel - Nivel de ánimo de 1 a 10
 * @returns {string} - Clase CSS de color
 */
export const obtenerColorAnimo = (nivel) => {
  if (nivel === undefined || nivel === null || isNaN(nivel)) {
    return 'text-gray-400';
  }
  
  const nivelNum = Number(nivel);
  
  if (nivelNum <= 3) return 'text-red-600';
  if (nivelNum <= 5) return 'text-orange-500';
  if (nivelNum <= 7) return 'text-yellow-500';
  if (nivelNum <= 9) return 'text-green-500';
  return 'text-emerald-600';
};

/**
 * Obtiene el color de fondo según el nivel de ánimo
 * @param {number} nivel - Nivel de ánimo de 1 a 10
 * @returns {string} - Clase CSS de color de fondo
 */
export const obtenerBgColorAnimo = (nivel) => {
  if (nivel === undefined || nivel === null || isNaN(nivel)) {
    return 'bg-gray-100';
  }
  
  const nivelNum = Number(nivel);
  
  if (nivelNum <= 3) return 'bg-red-100';
  if (nivelNum <= 5) return 'bg-orange-100';
  if (nivelNum <= 7) return 'bg-yellow-100';
  if (nivelNum <= 9) return 'bg-green-100';
  return 'bg-emerald-100';
};

/**
 * Obtiene la descripción textual del nivel de ánimo
 * @param {number} nivel - Nivel de ánimo de 1 a 10
 * @returns {string} - Descripción textual
 */
export const obtenerDescripcionAnimo = (nivel) => {
  if (nivel === undefined || nivel === null || isNaN(nivel)) {
    return 'Sin datos';
  }
  
  const nivelNum = Number(nivel);
  
  if (nivelNum <= 2) return 'Muy bajo';
  if (nivelNum <= 4) return 'Bajo';
  if (nivelNum <= 6) return 'Moderado';
  if (nivelNum <= 8) return 'Bueno';
  if (nivelNum <= 9) return 'Muy bueno';
  return 'Excelente';
};

/**
 * Lista de todas las emociones disponibles
 * @returns {Array} - Array de objetos con información de cada emoción
 */
export const obtenerTodasLasEmociones = () => {
  return Object.entries(EMOCIONES_MAP).map(([key, value]) => ({
    id: key,
    ...value
  }));
};

/**
 * Calcula el promedio de un array de registros emocionales
 * @param {Array} registros - Array de registros con nivel_animo
 * @returns {number} - Promedio redondeado a 1 decimal
 */
export const calcularPromedioAnimo = (registros) => {
  if (!registros || registros.length === 0) {
    return 0;
  }

  const suma = registros.reduce((acc, registro) => {
    return acc + (registro.nivel_animo || 0);
  }, 0);

  return Math.round((suma / registros.length) * 10) / 10;
};

/**
 * Obtiene las emociones más frecuentes de un array de registros
 * @param {Array} registros - Array de registros con emocion_principal
 * @param {number} limite - Cantidad máxima de emociones a retornar
 * @returns {Array} - Array de objetos con emoción y cantidad
 */
export const obtenerEmocionesFrecuentes = (registros, limite = 5) => {
  if (!registros || registros.length === 0) {
    return [];
  }

  // Contar frecuencia de cada emoción
  const frecuencias = registros.reduce((acc, registro) => {
    const emocion = registro.emocion_principal;
    if (emocion) {
      acc[emocion] = (acc[emocion] || 0) + 1;
    }
    return acc;
  }, {});

  // Convertir a array y ordenar por frecuencia
  const emocionesOrdenadas = Object.entries(frecuencias)
    .map(([emocion, cantidad]) => ({
      emocion,
      cantidad,
      info: obtenerInfoEmocion(emocion)
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite);

  return emocionesOrdenadas;
};

export default {
  EMOCIONES_MAP,
  obtenerInfoEmocion,
  obtenerColorAnimo,
  obtenerBgColorAnimo,
  obtenerDescripcionAnimo,
  obtenerTodasLasEmociones,
  calcularPromedioAnimo,
  obtenerEmocionesFrecuentes
};