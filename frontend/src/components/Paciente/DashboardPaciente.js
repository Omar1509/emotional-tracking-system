// frontend/src/components/Paciente/DashboardPaciente.js
// ✅ COLORES SUAVES + NOMBRE COMPLETO

import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const DashboardPaciente = ({ setCurrentView }) => {
  const [usuario, setUsuario] = useState(null);
  const [proximaCita, setProximaCita] = useState(null);
  const [ejerciciosPendientes, setEjerciciosPendientes] = useState([]);
  const [emocionHoy, setEmocionHoy] = useState(null);
  const [notificacion, setNotificacion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    try {
      const usuarioData = JSON.parse(localStorage.getItem('user'));
      setUsuario(usuarioData);

      // ✅ Cargar próxima cita
      try {
        const citasResponse = await api.get('/citas/paciente/mis-citas');
        const citasData = citasResponse?.citas || [];
        const citasPendientes = citasData.filter(
          cita => cita.estado === 'programada' && !cita.ya_paso
        );
        if (citasPendientes.length > 0) {
          setProximaCita(citasPendientes[0]);
        }
      } catch (error) {
        console.error('Error cargando citas:', error);
        setProximaCita(null);
      }

      // ✅ FIX DEFINITIVO: El backend devuelve ARRAY DIRECTO
      try {
        const ejerciciosResponse = await api.get('/ejercicios/mis-ejercicios');
        console.log('📦 Respuesta de ejercicios:', ejerciciosResponse);
        
        // El backend devuelve directamente un array, NO un objeto
        let ejerciciosData = [];
        
        if (Array.isArray(ejerciciosResponse)) {
          // ✅ CASO CORRECTO: Array directo
          ejerciciosData = ejerciciosResponse;
        } else if (ejerciciosResponse && Array.isArray(ejerciciosResponse.ejercicios)) {
          // ❌ CASO INCORRECTO: Objeto con propiedad ejercicios
          ejerciciosData = ejerciciosResponse.ejercicios;
        }
        
        console.log('✅ Total ejercicios:', ejerciciosData.length);
        
        // Filtrar solo pendientes
        const pendientes = ejerciciosData.filter(
          ejercicio => ejercicio.estado === 'PENDIENTE'
        );
        
        console.log('✅ Ejercicios pendientes:', pendientes.length);
        setEjerciciosPendientes(pendientes);
      } catch (error) {
        console.error('Error cargando ejercicios:', error);
        setEjerciciosPendientes([]);
      }

      // ✅ Cargar emoción de hoy
      try {
        const emocionResponse = await api.get(`/emociones-diarias/${usuarioData.id_usuario}?dias=1`);
        if (emocionResponse?.emociones_diarias && emocionResponse.emociones_diarias.length > 0) {
          setEmocionHoy(emocionResponse.emociones_diarias[0]);
        }
      } catch (error) {
        console.error('Error cargando emoción:', error);
        setEmocionHoy(null);
      }

    } catch (error) {
      console.error('Error cargando dashboard:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar algunos datos');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const obtenerEmojiEmocion = (emocion) => {
    const emojis = {
      'tristeza': '😢',
      'alegria': '😊',
      'alegría': '😊',
      'enojo': '😠',
      'miedo': '😰',
      'sorpresa': '😲',
      'ansiedad': '😰',
      'calma': '😌',
      'neutral': '😐'
    };
    return emojis[emocion?.toLowerCase()] || '😊';
  };

  const obtenerColorEmocion = (emocion) => {
    const colores = {
      'tristeza': 'from-blue-300 to-blue-400',
      'alegria': 'from-yellow-200 to-yellow-400',
      'alegría': 'from-yellow-200 to-yellow-400',
      'amor': 'from-pink-300 to-pink-400',
      'enojo': 'from-red-300 to-red-400',
      'miedo': 'from-purple-300 to-purple-400',
      'sorpresa': 'from-orange-300 to-orange-400',
      'ansiedad': 'from-purple-300 to-purple-400',
      'neutral': 'from-gray-300 to-gray-400'
    };
    return colores[emocion?.toLowerCase()] || 'from-gray-300 to-gray-400';
  };

  const obtenerIconoEjercicio = (tipo) => {
    const iconos = {
      'respiracion': '🌬️',
      'meditacion': '🧘',
      'escritura': '✏️',
      'actividad_fisica': '🏃',
      'mindfulness': '🌸',
      'relajacion': '😌'
    };
    return iconos[tipo] || '📋';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg text-gray-700">Cargando tu información...</p>
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">
            ¡Hola, {usuario?.nombre_completo || usuario?.nombre || 'Paciente'}! 👋
          </h1>
          <p className="text-xl text-gray-600">Aquí tienes un resumen de tu progreso terapéutico</p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Emoción del Día */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              📊 Tu Emoción de Hoy
            </h3>
            
            {emocionHoy ? (
              <div className="text-center">
                <div className={`inline-block bg-gradient-to-br ${obtenerColorEmocion(emocionHoy.emocion_dominante)} rounded-full p-8 mb-4 shadow-lg`}>
                  <span className="text-6xl">
                    {obtenerEmojiEmocion(emocionHoy.emocion_dominante)}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-gray-800 capitalize mb-2">
                  {emocionHoy.emocion_dominante}
                </h4>
                <p className="text-gray-600 text-sm">
                  Basado en {emocionHoy.total_interacciones} interacción(es)
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">😊</p>
                <p className="text-sm">Usa el chatbot para registrar tus emociones</p>
              </div>
            )}
          </div>

          {/* Card: Próxima Cita */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              📅 Próxima Sesión
            </h3>
            
            {proximaCita ? (
              <div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-3">
                  <p className="text-3xl text-center mb-3">👨‍⚕️</p>
                  <p className="text-sm text-gray-600 mb-2">Con: {proximaCita.psicologo?.nombre}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(proximaCita.fecha).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Hora</p>
                      <p className="font-semibold text-gray-800">
                        {proximaCita.hora_inicio?.substring(0, 5)}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('citas')}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 font-medium transition-all"
                >
                  Ver Todas las Citas
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">📆</p>
                <p className="text-sm">No tienes citas programadas</p>
                <button
                  onClick={() => setCurrentView('citas')}
                  className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Ver Cronograma
                </button>
              </div>
            )}
          </div>

          {/* Card: Ejercicios Pendientes */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              ✏️ Ejercicios Pendientes
            </h3>
            
            {ejerciciosPendientes.length > 0 ? (
              <div>
                <div className="space-y-3 mb-4">
                  {ejerciciosPendientes.slice(0, 2).map((ejercicio) => (
                    <div key={ejercicio.id_asignacion} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{obtenerIconoEjercicio(ejercicio.ejercicio_tipo)}</span>
                        <p className="font-semibold text-gray-800 text-sm flex-1 line-clamp-1">
                          {ejercicio.ejercicio_titulo}
                        </p>
                      </div>
                      {ejercicio.fecha_limite && (
                        <p className="text-xs text-gray-600">
                          Vence: {new Date(ejercicio.fecha_limite).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                {ejerciciosPendientes.length > 2 && (
                  <p className="text-center text-gray-500 text-sm mb-3">
                    +{ejerciciosPendientes.length - 2} más
                  </p>
                )}
                
                <button
                  onClick={() => setCurrentView('ejercicios')}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-medium transition-all"
                >
                  Ver Todos los Ejercicios
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-sm">¡Excelente! No tienes ejercicios pendientes</p>
                <button
                  onClick={() => setCurrentView('ejercicios')}
                  className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Ver Historial
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('chat')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                💬
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">Chatbot de Apoyo</h4>
                <p className="text-sm text-gray-600">Habla sobre tus emociones</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('historial')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                📈
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">Mi Historial</h4>
                <p className="text-sm text-gray-600">Revisa tu progreso</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('citas')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                📅
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-800">Mis Citas</h4>
                <p className="text-sm text-gray-600">Gestiona tus sesiones</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPaciente;