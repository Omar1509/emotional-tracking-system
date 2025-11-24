// frontend/src/components/Paciente/DashboardPaciente.js
// ✅ VERSIÓN ACTUALIZADA - SIN REGISTRO MANUAL DE EMOCIONES
// Las emociones se calculan automáticamente desde el chat

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

      // Cargar próxima cita
      try {
        const citasResponse = await api.get('/citas/paciente/mis-citas');
        const citasPendientes = citasResponse.citas.filter(
          cita => cita.estado === 'programada' && !cita.ya_paso
        );
        if (citasPendientes.length > 0) {
          setProximaCita(citasPendientes[0]);
        }
      } catch (error) {
        console.error('Error cargando citas:', error);
      }

      // Cargar ejercicios pendientes
      try {
        const ejerciciosResponse = await api.get('/ejercicios/mis-ejercicios');
        const pendientes = ejerciciosResponse.ejercicios_asignados.filter(
          ej => ej.esta_activo && ej.estado !== 'completado'
        );
        setEjerciciosPendientes(pendientes.slice(0, 3));
      } catch (error) {
        console.error('Error cargando ejercicios:', error);
      }

      // ✅ Cargar emoción del día (calculada automáticamente desde el chat)
      try {
        const emocionResponse = await api.get(
          `/emociones-diarias/emociones-diarias/${usuarioData.id_usuario}?dias=1`
        );

        if (emocionResponse.emociones_diarias.length > 0) {
          setEmocionHoy(emocionResponse.emociones_diarias[0]);
        }
      } catch (error) {
        console.error('Error cargando emoción:', error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo cargar la información del dashboard');
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const obtenerEmojiEmocion = (emocion) => {
    const emociones = {
      'tristeza': '😢',
      'alegria': '😊',
      'alegría': '😊',
      'amor': '❤️',
      'enojo': '😠',
      'miedo': '😰',
      'sorpresa': '😲',
      'ansiedad': '😰',
      'neutral': '😐'
    };
    return emociones[emocion?.toLowerCase()] || '😊';
  };

  const obtenerColorEmocion = (emocion) => {
    const colores = {
      'tristeza': 'from-blue-400 to-blue-600',
      'alegria': 'from-yellow-300 to-yellow-500',
      'alegría': 'from-yellow-300 to-yellow-500',
      'amor': 'from-pink-400 to-pink-600',
      'enojo': 'from-red-400 to-red-600',
      'miedo': 'from-purple-400 to-purple-600',
      'sorpresa': 'from-orange-400 to-orange-600',
      'ansiedad': 'from-purple-400 to-purple-600',
      'neutral': 'from-gray-400 to-gray-600'
    };
    return colores[emocion?.toLowerCase()] || 'from-gray-400 to-gray-600';
  };

  const obtenerIconoEjercicio = (tipo) => {
    const iconos = {
      'respiracion': '🌬️',
      'meditacion': '🧘',
      'escritura': '✍️',
      'actividad_fisica': '🏃',
      'mindfulness': '🌸'
    };
    return iconos[tipo] || '📋';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg">Cargando tu información...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
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
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl font-bold mb-2">¡Hola, {usuario?.nombre}! 👋</h1>
          <p className="text-xl text-indigo-100">Aquí tienes un resumen de tu progreso terapéutico</p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Emoción del Día */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              📊 Tu Emoción de Hoy
            </h3>
            
            {emocionHoy ? (
              <div className="text-center py-4">
                <div
                  className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br ${obtenerColorEmocion(emocionHoy.emocion_dominante)} flex items-center justify-center text-5xl animate-pulse`}
                >
                  {obtenerEmojiEmocion(emocionHoy.emocion_dominante)}
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2 capitalize">
                  {emocionHoy.emocion_dominante}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  📱 Detectado automáticamente desde tus conversaciones
                </p>
                <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700">
                  💬 {emocionHoy.total_interacciones} interacciones hoy
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  💬 Habla con nuestro chatbot para que detectemos tu estado emocional
                </p>
                <button
                  onClick={() => setCurrentView('chat')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 font-semibold transition-all"
                >
                  Ir al Chatbot
                </button>
              </div>
            )}
          </div>

          {/* Card: Próxima Cita */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              📅 Próxima Cita
            </h3>
            
            {proximaCita ? (
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white w-20 h-20 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold leading-none">
                    {new Date(proximaCita.fecha).getDate()}
                  </span>
                  <span className="text-xs uppercase mt-1">
                    {new Date(proximaCita.fecha).toLocaleDateString('es-ES', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-indigo-600 font-semibold mb-1">
                    ⏰ {proximaCita.hora_inicio?.substring(0, 5)}
                  </p>
                  <p className="text-gray-700 font-medium mb-1">
                    👨‍⚕️ {proximaCita.psicologo?.nombre || 'Psicólogo'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {proximaCita.modalidad === 'virtual' ? '💻' : '🏥'} 
                    {proximaCita.modalidad === 'virtual' ? ' Virtual' : ' Presencial'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No tienes citas programadas</p>
              </div>
            )}
          </div>

          {/* Card: Ejercicios Pendientes */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              📋 Ejercicios Pendientes
            </h3>
            
            {ejerciciosPendientes.length > 0 ? (
              <div className="space-y-3">
                {ejerciciosPendientes.map((ejercicio) => (
                  <div
                    key={ejercicio.id_asignacion}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                      {obtenerIconoEjercicio(ejercicio.ejercicio.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {ejercicio.ejercicio.titulo}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ejercicio.ejercicio.duracion_minutos} min • {ejercicio.veces_completadas}/{ejercicio.veces_requeridas}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No tienes ejercicios pendientes</p>
              </div>
            )}
          </div>

          {/* Card: Acciones Rápidas */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-100">
              ⚡ Acciones Rápidas
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all hover:scale-105"
              >
                <span className="text-3xl mb-2">💬</span>
                <span className="font-semibold">Chatbot</span>
              </button>
              
              <button
                onClick={() => setCurrentView('citas')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all hover:scale-105"
              >
                <span className="text-3xl mb-2">📅</span>
                <span className="font-semibold">Mis Citas</span>
              </button>
              
              <button
                onClick={() => setCurrentView('ejercicios')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all hover:scale-105"
              >
                <span className="text-3xl mb-2">🎯</span>
                <span className="font-semibold">Ejercicios</span>
              </button>
              
              <button
                onClick={() => setCurrentView('historial')}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-500 to-red-500 text-white rounded-xl hover:from-pink-600 hover:to-red-600 transition-all hover:scale-105"
              >
                <span className="text-3xl mb-2">📈</span>
                <span className="font-semibold">Mi Historial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-6 text-white">
          <div className="flex items-start space-x-4">
            <div className="text-4xl">💡</div>
            <div>
              <h4 className="text-xl font-bold mb-2">¿Cómo funciona la detección automática de emociones?</h4>
              <p className="text-indigo-100 leading-relaxed">
                Cada vez que hablas con nuestro chatbot, nuestra inteligencia artificial analiza tus mensajes 
                para detectar tu estado emocional. Al final del día (23:59), calculamos un promedio de todas 
                tus emociones y lo mostramos aquí. Esto le permite a tu psicólogo hacer un seguimiento más 
                preciso de tu bienestar emocional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPaciente;