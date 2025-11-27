// frontend/src/components/Paciente/MisCitas.js
// ✅ COLORES SUAVES

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const MisCitas = ({ setCurrentView }) => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [filtro, setFiltro] = useState('todas'); // todas, proximas, pasadas

  useEffect(() => {
    cargarCitas();
  }, []);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/citas/paciente/mis-citas');
      
      // Ordenar por fecha (más reciente primero)
      const citasOrdenadas = response.citas.sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
      );
      
      setCitas(citasOrdenadas);
    } catch (error) {
      console.error('Error cargando citas:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const obtenerEstadoCita = (cita) => {
    const fechaCita = new Date(cita.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaCita.setHours(0, 0, 0, 0);

    if (cita.estado === 'completada') {
      return {
        texto: 'Asistió',
        icono: <CheckCircle className="w-6 h-6" />,
        color: 'text-green-600',
        bg: 'bg-green-100',
        border: 'border-green-300'
      };
    } else if (cita.estado === 'cancelada') {
      return {
        texto: 'Cancelada',
        icono: <XCircle className="w-6 h-6" />,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        border: 'border-gray-300'
      };
    } else if (cita.estado === 'no_asistio') {
      return {
        texto: 'No Asistió',
        icono: <XCircle className="w-6 h-6" />,
        color: 'text-red-600',
        bg: 'bg-red-100',
        border: 'border-red-300'
      };
    } else if (fechaCita < hoy) {
      // Cita pasada sin estado definido
      return {
        texto: 'Pendiente de confirmar',
        icono: <AlertCircle className="w-6 h-6" />,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        border: 'border-orange-300'
      };
    } else if (fechaCita.getTime() === hoy.getTime()) {
      return {
        texto: 'Hoy',
        icono: <AlertCircle className="w-6 h-6" />,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-300'
      };
    } else {
      return {
        texto: 'Programada',
        icono: <Calendar className="w-6 h-6" />,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        border: 'border-purple-300'
      };
    }
  };

  const citasFiltradas = citas.filter(cita => {
    const fechaCita = new Date(cita.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaCita.setHours(0, 0, 0, 0);

    if (filtro === 'proximas') {
      return fechaCita >= hoy && cita.estado === 'programada';
    } else if (filtro === 'pasadas') {
      return fechaCita < hoy || cita.estado !== 'programada';
    }
    return true; // todas
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-800">Cargando tus citas...</p>
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
          
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📅 Mis Citas</h1>
            <p className="text-gray-600">Cronograma de sesiones terapéuticas</p>
          </div>

          <div className="w-24"></div> {/* Spacer para centrar el título */}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setFiltro('todas')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtro === 'todas'
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({citas.length})
            </button>
            <button
              onClick={() => setFiltro('proximas')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtro === 'proximas'
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Próximas ({citas.filter(c => new Date(c.fecha) >= new Date() && c.estado === 'programada').length})
            </button>
            <button
              onClick={() => setFiltro('pasadas')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtro === 'pasadas'
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pasadas ({citas.filter(c => new Date(c.fecha) < new Date() || c.estado !== 'programada').length})
            </button>
          </div>
        </div>

        {/* Lista de Citas */}
        {citasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No hay citas {filtro === 'proximas' ? 'próximas' : filtro === 'pasadas' ? 'pasadas' : ''}
            </h3>
            <p className="text-gray-600">
              {filtro === 'proximas' && 'Contacta a tu psicólogo para agendar una nueva sesión'}
              {filtro === 'pasadas' && 'Aún no has tenido sesiones registradas'}
              {filtro === 'todas' && 'No tienes citas registradas en el sistema'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {citasFiltradas.map((cita) => {
              const estado = obtenerEstadoCita(cita);
              return (
                <div
                  key={cita.id_cita}
                  className={`bg-white rounded-xl shadow-lg p-6 border-l-8 ${estado.border} hover:shadow-2xl transition-all`}
                >
                  <div className="flex items-start justify-between">
                    {/* Info Principal */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-3xl">
                          {cita.modalidad === 'virtual' ? '💻' : '🏥'}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">
                            Sesión con Dr(a). {cita.psicologo?.nombre || 'Psicólogo'}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize">
                            {cita.modalidad || 'virtual'}
                          </p>
                        </div>
                      </div>

                      {/* Fecha y Hora */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-xs text-gray-500">Fecha</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(cita.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-xs text-gray-500">Hora</p>
                            <p className="font-semibold text-gray-800">
                              {cita.hora_inicio?.substring(0, 5)} - {cita.hora_fin?.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* URL de videollamada si es virtual */}
                      {cita.modalidad === 'virtual' && cita.url_videollamada && (
                        <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg mb-4">
                          <Video className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-xs text-blue-600 mb-1">Enlace de videollamada</p>
                            <a
                              href={cita.url_videollamada}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-700 hover:text-blue-900 underline font-medium"
                            >
                              Unirse a la sesión
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Notas */}
                      {cita.notas_previas && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Notas:</p>
                          <p className="text-sm text-gray-700">{cita.notas_previas}</p>
                        </div>
                      )}
                    </div>

                    {/* Estado Badge */}
                    <div className={`flex flex-col items-center justify-center p-4 rounded-xl ${estado.bg} border-2 ${estado.border} min-w-[140px]`}>
                      <div className={estado.color}>
                        {estado.icono}
                      </div>
                      <p className={`mt-2 font-bold text-sm ${estado.color}`}>
                        {estado.texto}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <p className="text-gray-600 text-sm mb-1">Total Citas</p>
            <p className="text-4xl font-bold text-indigo-600">{citas.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <p className="text-gray-600 text-sm mb-1">Asistidas</p>
            <p className="text-4xl font-bold text-green-600">
              {citas.filter(c => c.estado === 'completada').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <p className="text-gray-600 text-sm mb-1">Inasistencias</p>
            <p className="text-4xl font-bold text-red-600">
              {citas.filter(c => c.estado === 'no_asistio').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <p className="text-gray-600 text-sm mb-1">Próximas</p>
            <p className="text-4xl font-bold text-purple-600">
              {citas.filter(c => new Date(c.fecha) >= new Date() && c.estado === 'programada').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisCitas;