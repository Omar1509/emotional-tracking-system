// frontend/src/config/api.js
// ✅ VERSIÓN OPTIMIZADA Y COMPLETA

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:8000';

// ==================== CLASE DE ERROR PERSONALIZADA ====================
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ==================== FUNCIÓN PRINCIPAL DE API ====================
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Manejar respuestas no exitosas
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Si el token expiró, limpiar localStorage y redirigir
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/';
        throw new ApiError('Sesión expirada. Por favor, inicia sesión nuevamente.', 401, errorData);
      }
      
      throw new ApiError(
        errorData.detail || errorData.message || 'Error en la petición',
        response.status,
        errorData
      );
    }

    // Si es 204 No Content, no intentar parsear JSON
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    // Si es ApiError, relanzar
    if (error instanceof ApiError) {
      throw error;
    }

    // Si es error de red
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError('Error de conexión. Verifica que el servidor esté activo.', 0, {});
    }

    // Otros errores
    throw new ApiError(error.message || 'Error desconocido', 500, {});
  }
};

// ==================== LOGIN CON OAUTH2 ====================
export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  try {
    const response = await fetch(`${AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.detail || 'Error al iniciar sesión', response.status, error);
    }

    const data = await response.json();
    
    // ✅ GUARDAR TODO EN LOCALSTORAGE DE FORMA CONSISTENTE
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('nombre_completo', data.nombre_completo);
    
    // ✅ GUARDAR OBJETO USER COMPLETO
    localStorage.setItem('user', JSON.stringify({
      id_usuario: data.user_id,
      nombre_completo: data.nombre_completo,
      rol: data.role,
      requiere_cambio_password: data.requiere_cambio_password || false
    }));
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Error de conexión', 500, {});
  }
};

// ==================== CAMBIAR CONTRASEÑA ====================
export const cambiarPassword = async (passwordActual, passwordNueva) => {
  return apiCall('/auth/cambiar-password', {
    method: 'POST',
    body: JSON.stringify({
      password_actual: passwordActual,
      password_nueva: passwordNueva
    })
  });
};

// ==================== VERIFICAR TOKEN ====================
export const verificarToken = async () => {
  return apiCall('/auth/verificar-token', {
    method: 'POST'
  });
};

// ==================== HELPERS ====================

/**
 * Obtiene el usuario actual desde localStorage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
};

/**
 * Cierra sesión y limpia localStorage
 */
export const logout = () => {
  localStorage.clear();
  window.location.href = '/';
};

/**
 * Verifica si el usuario está autenticado
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Obtiene el rol del usuario actual
 */
export const getUserRole = () => {
  return localStorage.getItem('role');
};

// ==================== INTERCEPTOR GLOBAL ====================
// Para usar en componentes que necesitan hacer múltiples peticiones
export const createApiClient = () => {
  return {
    get: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => apiCall(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(body) 
    }),
    put: (endpoint, body, options = {}) => apiCall(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(body) 
    }),
    delete: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'DELETE' }),
  };
};

// ==================== EXPORTACIONES ====================
export default API_URL;

export const api = createApiClient();