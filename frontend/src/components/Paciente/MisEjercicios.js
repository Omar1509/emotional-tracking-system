// frontend/src/components/Paciente/MisEjercicios.js
// ✅ COLORES SUAVES

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, ArrowLeft, Target, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const MisEjercicios = ({ setCurrentView }) => {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [completando, setCompletando] = useState(null);

  useEffect(() => {
    cargarEjercicios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarEjercicios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ejercicios/mis-ejercicios');
      
      console.log('📦 Respuesta raw del backend:', response);
      
      let ejerciciosData = [];
      
      if (Array.isArray(response)) {
        ejerciciosData = response;
        console.log('✅ Formato correcto: Array directo con', ejerciciosData.length, 'ejercicios');
      } else if (response?.ejercicios_asignados && Array.isArray(response.ejercicios_asignados)) {
        ejerciciosData = response.ejercicios_asignados;
        console.log('✅ Formato alternativo detectado');
      } else {
        console.warn('⚠️ Formato inesperado:', response);
        ejerciciosData = [];
      }

      console.log('✅ Total ejercicios cargados:', ejerciciosData.length);
      console.log('📋 Ejercicios:', ejerciciosData);
      
      setEjercicios(ejerciciosData);
    } catch (error) {
      console.error('❌ Error cargando ejercicios:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar los ejercicios');
      setEjercicios([]);
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const marcarComoCompletado = async (idAsignacion) => {
    try {
      setCompletando(idAsignacion);
      
      console.log('🎯 Intentando completar ejercicio con ID:', idAsignacion);
      console.log('📍 Ruta que se usará:', `/ejercicios/completar/${idAsignacion}`);
      
      await api.post(`/ejercicios/completar/${idAsignacion}`, {
        calificacion: 5,
        comentario: "Ejercicio completado desde la aplicación"
      });

      console.log('✅ Ejercicio completado exitosamente');
      mostrarNotificacion('exito', '¡Excelente!', 'Ejercicio marcado como completado');
      
      await cargarEjercicios();
    } catch (error) {
      console.error('❌ Error completando ejercicio:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo marcar el ejercicio como completado');
    } finally {
      setCompletando(null);
    }
  };

  const obtenerIconoEjercicio = (tipo) => {
    const iconos = {
      'respiracion': '🌬️',
      'meditacion': '🧘',
      'escritura': '✍️',
      'actividad_fisica': '🏃',
      'mindfulness': '🌸',
      'relajacion': '😌',
      'reflexion': '💭',
      'social': '👥'
    };
    return iconos[tipo] || '📋';
  };

  const obtenerColorPorEstado = (estado) => {
    const estadoUpper = estado?.toUpperCase() || '';
    
    switch (estadoUpper) {
      case 'COMPLETADO':
      case 'COMPLETED':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-800',
          badge: 'bg-green-100 text-green-800'
        };
      case 'EN_PROGRESO':
      case 'IN_PROGRESS':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'VENCIDO':
      case 'EXPIRED':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-300',
          text: 'text-purple-800',
          badge: 'bg-purple-100 text-purple-800'
        };
    }
  };

  const calcularProgreso = (ejercicio) => {
    const completadas = ejercicio.veces_completadas || 0;
    const requeridas = ejercicio.veces_requeridas || 1;
    const porcentaje = (completadas / requeridas) * 100;
    return Math.min(porcentaje, 100);
  };

  const ejerciciosActivos = ejercicios.filter(e => {
    const estado = e.estado?.toUpperCase();
    const noCompletado = estado !== 'COMPLETADO' && estado !== 'COMPLETED';
    const noVencido = estado !== 'VENCIDO' && estado !== 'EXPIRED';
    
    return noCompletado && noVencido;
  });
  
  const ejerciciosCompletados = ejercicios.filter(e => {
    const estado = e.estado?.toUpperCase();
    return estado === 'COMPLETADO' || estado === 'COMPLETED';
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-800">Cargando tus ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Mis Ejercicios</h1>
          <div className="w-20"></div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Asignados</p>
                <p className="text-3xl font-bold mt-2">{ejercicios.length}</p>
              </div>
              <Activity className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-300 to-green-400 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completados</p>
                <p className="text-3xl font-bold mt-2">{ejerciciosCompletados.length}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-300 to-purple-400 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">En Progreso</p>
                <p className="text-3xl font-bold mt-2">{ejerciciosActivos.length}</p>
              </div>
              <Target className="w-12 h-12 text-purple-100" />
            </div>
          </div>
        </div>

        {/* Ejercicios Activos */}
        {ejerciciosActivos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Ejercicios Pendientes</h2>
            <div className="space-y-6">
              {ejerciciosActivos.map((ejercicio) => {
                const titulo = ejercicio.ejercicio_titulo || 'Ejercicio';
                const tipo = ejercicio.ejercicio_tipo || 'respiracion';
                const colores = obtenerColorPorEstado(ejercicio.estado);
                const progreso = calcularProgreso(ejercicio);
                const descripcion = ejercicio.ejercicio_descripcion || '';
                const instrucciones = ejercicio.ejercicio_instrucciones || '';
                const duracion = ejercicio.duracion_minutos || 0;
                const dificultad = ejercicio.nivel_dificultad || 'principiante';

                return (
                  <div
                    key={ejercicio.id_asignacion}
                    className={`bg-white rounded-xl shadow-lg p-6 border-l-8 ${colores.border} hover:shadow-2xl transition-all`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="text-5xl">
                          {obtenerIconoEjercicio(tipo)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {titulo}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {descripcion}
                          </p>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colores.badge}`}>
                              {ejercicio.estado?.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{duracion} min</span>
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold capitalize">
                              {tipo?.replace('_', ' ')}
                            </span>
                            {dificultad && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold capitalize">
                                {dificultad}
                              </span>
                            )}
                          </div>

                          {/* Instrucciones */}
                          {instrucciones && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                              <p className="text-sm font-semibold text-gray-700 mb-2">📋 Instrucciones:</p>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {instrucciones}
                              </p>
                            </div>
                          )}

                          {/* Progreso */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">
                                Progreso: {ejercicio.veces_completadas || 0}/{ejercicio.veces_requeridas || 1}
                              </span>
                              <span className="text-sm font-bold text-indigo-600">
                                {Math.round(progreso)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-indigo-400 to-purple-400 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                          </div>

                          {/* Fechas */}
                          {ejercicio.fecha_asignacion && (
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  Asignado: {new Date(ejercicio.fecha_asignacion).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                              {ejercicio.fecha_limite && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Límite: {new Date(ejercicio.fecha_limite).toLocaleDateString('es-ES')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón Completar */}
                      <button
                        onClick={() => marcarComoCompletado(ejercicio.id_asignacion)}
                        disabled={completando === ejercicio.id_asignacion}
                        className="flex flex-col items-center justify-center px-6 py-4 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-xl hover:from-green-500 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed min-w-[140px]"
                      >
                        {completando === ejercicio.id_asignacion ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="font-semibold">Guardando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-8 h-8 mb-2" />
                            <span className="font-semibold">Completar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Notas del psicólogo */}
                    {ejercicio.notas_psicologo && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">💬 Nota de tu psicólogo:</p>
                        <p className="text-sm text-blue-800">
                          {ejercicio.notas_psicologo}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ejercicios Completados */}
        {ejerciciosCompletados.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">✅ Ejercicios Completados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ejerciciosCompletados.map((ejercicio) => {
                const titulo = ejercicio.ejercicio_titulo || 'Ejercicio';
                const tipo = ejercicio.ejercicio_tipo || 'respiracion';
                
                return (
                  <div
                    key={ejercicio.id_asignacion}
                    className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-400"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">
                        {obtenerIconoEjercicio(tipo)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{titulo}</h4>
                        <p className="text-sm text-gray-600">
                          Completado {ejercicio.veces_completadas || 0}/{ejercicio.veces_requeridas || 1} veces
                        </p>
                        {ejercicio.fecha_completado && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(ejercicio.fecha_completado).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sin ejercicios */}
        {ejercicios.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No tienes ejercicios asignados
            </h3>
            <p className="text-gray-600">
              Tu psicólogo te asignará ejercicios terapéuticos personalizados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisEjercicios;