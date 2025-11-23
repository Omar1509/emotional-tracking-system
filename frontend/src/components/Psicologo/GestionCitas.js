// frontend/src/components/Psicologo/GestionCitas.js
// ✅ VERSIÓN OPTIMIZADA - 100% TAILWIND CSS (SIN CSS EXTERNO)

import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import { Calendar, Clock, Video, MapPin, Plus, Check, X, AlertCircle, User } from 'lucide-react';
import Notificacion from '../Shared/Notificacion';

const GestionCitas = () => {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [filtro, setFiltro] = useState('todas');

  const [formularioCita, setFormularioCita] = useState({
    id_paciente: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    duracion_minutos: 60,
    modalidad: 'virtual',
    url_videollamada: '',
    notas_previas: '',
    objetivos: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const citasResponse = await api.get('/citas/psicologo/mis-citas');
      setCitas(citasResponse.citas || []);

      const pacientesResponse = await api.get('/psicologos/mis-pacientes');
      setPacientes(pacientesResponse.pacientes || []);

      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar los datos');
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormularioCita({
      ...formularioCita,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const citaData = {
        id_paciente: parseInt(formularioCita.id_paciente),
        fecha: formularioCita.fecha,
        hora_inicio: formularioCita.hora_inicio,
        hora_fin: formularioCita.hora_fin || null,
        duracion_minutos: parseInt(formularioCita.duracion_minutos),
        modalidad: formularioCita.modalidad,
        url_videollamada: formularioCita.url_videollamada || null,
        notas_previas: formularioCita.notas_previas || null,
        objetivos: formularioCita.objetivos || null
      };

      const response = await api.post('/citas/crear', citaData);

      if (response.notificacion) {
        mostrarNotificacion(
          response.notificacion.tipo,
          response.notificacion.titulo,
          response.notificacion.descripcion
        );
      } else {
        mostrarNotificacion('exito', '¡Cita Creada!', 'La cita se ha programado correctamente');
      }

      setFormularioCita({
        id_paciente: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        duracion_minutos: 60,
        modalidad: 'virtual',
        url_videollamada: '',
        notas_previas: '',
        objetivos: ''
      });

      setMostrarFormulario(false);
      cargarDatos();

    } catch (error) {
      console.error('Error creando cita:', error);
      mostrarNotificacion(
        'error',
        'Error',
        error.message || 'No se pudo crear la cita'
      );
    }
  };

  const actualizarEstadoCita = async (idCita, nuevoEstado) => {
    try {
      await api.put(`/citas/${idCita}`, { estado: nuevoEstado });
      mostrarNotificacion('exito', 'Estado Actualizado', `Cita marcada como ${nuevoEstado}`);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo actualizar el estado');
    }
  };

  const citasFiltradas = citas.filter(cita => {
    if (filtro === 'pendientes') return cita.estado === 'programada';
    if (filtro === 'completadas') return cita.estado === 'completada';
    if (filtro === 'hoy') {
      const hoy = new Date().toISOString().split('T')[0];
      return cita.fecha === hoy;
    }
    return true;
  });

  const getEstadoBadge = (estado) => {
    const badges = {
      'programada': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⏳', text: 'Pendiente' },
      'completada': { color: 'bg-green-100 text-green-800 border-green-300', icon: '✓', text: 'Completada' },
      'no_asistio': { color: 'bg-red-100 text-red-800 border-red-300', icon: '✗', text: 'No asistió' },
      'cancelada': { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⊗', text: 'Cancelada' }
    };
    return badges[estado] || badges.programada;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
        <p className="text-white text-xl font-semibold">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 p-8 space-y-6 animate-fadeIn">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center space-x-3">
            <Calendar className="w-10 h-10" />
            <span>Gestión de Citas</span>
          </h1>
          <p className="text-purple-100 text-lg">Administra las citas con tus pacientes</p>
        </div>
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          {mostrarFormulario ? (
            <>
              <X className="w-5 h-5" />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Nueva Cita</span>
            </>
          )}
        </button>
      </div>

      {/* Formulario de Nueva Cita */}
      {mostrarFormulario && (
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-fadeIn">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <Calendar className="w-7 h-7 text-purple-600" />
            <span>Programar Nueva Cita</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paciente y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paciente *
                </label>
                <select
                  name="id_paciente"
                  value={formularioCita.id_paciente}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="">Selecciona un paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nombre} {paciente.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formularioCita.fecha}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hora Inicio *
                </label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={formularioCita.hora_inicio}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hora Fin
                </label>
                <input
                  type="time"
                  name="hora_fin"
                  value={formularioCita.hora_fin}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duración (min)
                </label>
                <input
                  type="number"
                  name="duracion_minutos"
                  value={formularioCita.duracion_minutos}
                  onChange={handleInputChange}
                  min="15"
                  step="15"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>
            </div>

            {/* Modalidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Modalidad *
                </label>
                <select
                  name="modalidad"
                  value={formularioCita.modalidad}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="virtual">💻 Virtual</option>
                  <option value="presencial">🏥 Presencial</option>
                </select>
              </div>

              {formularioCita.modalidad === 'virtual' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    URL Videollamada
                  </label>
                  <input
                    type="url"
                    name="url_videollamada"
                    value={formularioCita.url_videollamada}
                    onChange={handleInputChange}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas Previas
              </label>
              <textarea
                name="notas_previas"
                value={formularioCita.notas_previas}
                onChange={handleInputChange}
                rows="3"
                placeholder="Notas o preparación para la sesión..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
              />
            </div>

            {/* Objetivos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Objetivos de la Sesión
              </label>
              <textarea
                name="objetivos"
                value={formularioCita.objetivos}
                onChange={handleInputChange}
                rows="3"
                placeholder="¿Qué se espera lograr en esta sesión?"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex items-center space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                Crear Cita
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'todas', label: 'Todas', count: citas.length },
          { id: 'hoy', label: 'Hoy', count: citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length },
          { id: 'pendientes', label: 'Pendientes', count: citas.filter(c => c.estado === 'programada').length },
          { id: 'completadas', label: 'Completadas', count: citas.filter(c => c.estado === 'completada').length }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filtro === f.id
                ? 'bg-white text-purple-600 shadow-lg scale-105'
                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Lista de Citas */}
      <div className="space-y-4">
        {citasFiltradas.length > 0 ? (
          citasFiltradas.map(cita => {
            const badge = getEstadoBadge(cita.estado);
            
            return (
              <div
                key={cita.id_cita}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {cita.paciente.nombre_completo?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-800 mb-1">
                        {cita.paciente.nombre_completo}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(cita.fecha).toLocaleDateString('es-ES', { 
                              weekday: 'long', 
                              day: 'numeric',
                              month: 'long'
                            })}
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {cita.hora_inicio?.substring(0, 5)} - {cita.hora_fin?.substring(0, 5)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-4 py-2 ${badge.color} border-2 rounded-full text-sm font-semibold flex items-center space-x-1`}>
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </span>
                </div>

                {/* Detalles */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-gray-700">
                    {cita.modalidad === 'virtual' ? (
                      <>
                        <Video className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Virtual</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Presencial</span>
                      </>
                    )}
                    <span className="text-gray-500">• {cita.duracion_minutos} minutos</span>
                  </div>

                  {cita.notas_previas && (
                    <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                      <p className="text-sm font-semibold text-blue-900 mb-1">📝 Notas previas:</p>
                      <p className="text-sm text-blue-800">{cita.notas_previas}</p>
                    </div>
                  )}

                  {cita.objetivos && (
                    <div className="bg-purple-50 p-4 rounded-xl border-l-4 border-purple-500">
                      <p className="text-sm font-semibold text-purple-900 mb-1">🎯 Objetivos:</p>
                      <p className="text-sm text-purple-800">{cita.objetivos}</p>
                    </div>
                  )}

                  {cita.notas_sesion && (
                    <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
                      <p className="text-sm font-semibold text-green-900 mb-1">💬 Notas de sesión:</p>
                      <p className="text-sm text-green-800">{cita.notas_sesion}</p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                {cita.estado === 'programada' && (
                  <div className="flex items-center space-x-3 pt-4 border-t">
                    <button
                      onClick={() => actualizarEstadoCita(cita.id_cita, 'completada')}
                      className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-semibold flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Completar</span>
                    </button>
                    <button
                      onClick={() => actualizarEstadoCita(cita.id_cita, 'no_asistio')}
                      className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all font-semibold flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>No Asistió</span>
                    </button>
                    <button
                      onClick={() => actualizarEstadoCita(cita.id_cita, 'cancelada')}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              No hay citas {filtro !== 'todas' && filtro}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionCitas;