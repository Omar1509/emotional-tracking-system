// frontend/src/components/Psicologo/GestionCitas.js
// ✅ VERSIÓN ULTRA-CORREGIDA CON VALIDACIÓN DE CONFLICTOS DE HORARIOS

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Video, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const GestionCitas = ({ setCurrentView }) => {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [citaEditando, setCitaEditando] = useState(null);

  const [formData, setFormData] = useState({
    id_paciente: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    modalidad: 'virtual',
    notas_previas: '',
    url_videollamada: ''
  });

  // ✅ FUNCIÓN PARA CAPITALIZAR AUTOMÁTICAMENTE
  const capitalizarTexto = (texto) => {
    if (!texto) return texto;
    return texto
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar pacientes
      try {
        console.log('📡 Cargando pacientes...');
        const pacientesResponse = await api.get('/psicologos/mis-pacientes');
        console.log('✅ Pacientes recibidos:', pacientesResponse);
        setPacientes(pacientesResponse.pacientes || []);
      } catch (error) {
        console.error('❌ Error cargando pacientes:', error);
        setPacientes([]);
      }

      // Cargar citas
      try {
        console.log('📡 Cargando citas...');
        const citasResponse = await api.get('/citas/psicologo/mis-citas');
        console.log('✅ Citas recibidas:', citasResponse);
        
        // ✅ ORDENAR CITAS: de la más próxima a la más lejana
        const citasOrdenadas = (citasResponse.citas || []).sort((a, b) => {
          const fechaHoraA = new Date(`${a.fecha}T${a.hora_inicio}`);
          const fechaHoraB = new Date(`${b.fecha}T${b.hora_inicio}`);
          return fechaHoraA - fechaHoraB;
        });
        
        setCitas(citasOrdenadas);
      } catch (error) {
        console.error('❌ Error cargando citas:', error);
        mostrarNotificacion('error', 'Error', 'No se pudieron cargar las citas');
        setCitas([]);
      }

    } catch (error) {
      console.error('❌ Error general:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const verificarConflictoHorario = (fecha, horaInicio, horaFin, citaActualId = null) => {
    const citasDelDia = citas.filter(cita => {
      if (citaActualId && cita.id_cita === citaActualId) {
        return false;
      }
      return cita.fecha === fecha && cita.estado !== 'cancelada';
    });

    if (citasDelDia.length === 0) {
      return { hayConflicto: false };
    }

    const convertirAMinutos = (hora) => {
      const [horas, minutos] = hora.split(':').map(Number);
      return horas * 60 + minutos;
    };

    const inicioNuevo = convertirAMinutos(horaInicio);
    const finNuevo = horaFin ? convertirAMinutos(horaFin) : inicioNuevo + 60;

    for (const cita of citasDelDia) {
      const inicioExistente = convertirAMinutos(cita.hora_inicio);
      const finExistente = cita.hora_fin 
        ? convertirAMinutos(cita.hora_fin) 
        : inicioExistente + 60;

      const haySolapamiento = 
        (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) ||
        (finNuevo > inicioExistente && finNuevo <= finExistente) ||
        (inicioNuevo <= inicioExistente && finNuevo >= finExistente);

      if (haySolapamiento) {
        const pacienteConflicto = obtenerNombrePaciente(cita.id_paciente);
        return {
          hayConflicto: true,
          mensaje: `Ya tienes una cita programada a las ${cita.hora_inicio} con ${pacienteConflicto}`,
          cita: cita
        };
      }
    }

    return { hayConflicto: false };
  };

  const abrirModal = (cita = null) => {
    if (cita) {
      setCitaEditando(cita);
      setFormData({
        id_paciente: cita.id_paciente,
        fecha: cita.fecha,
        hora_inicio: cita.hora_inicio?.substring(0, 5) || '',
        hora_fin: cita.hora_fin?.substring(0, 5) || '',
        modalidad: cita.modalidad || 'virtual',
        notas_previas: cita.notas_previas || '',
        url_videollamada: cita.url_videollamada || ''
      });
    } else {
      setCitaEditando(null);
      setFormData({
        id_paciente: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        modalidad: 'virtual',
        notas_previas: '',
        url_videollamada: ''
      });
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setCitaEditando(null);
    setFormData({
      id_paciente: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      modalidad: 'virtual',
      notas_previas: '',
      url_videollamada: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📝 Datos del formulario:', formData);

    if (!formData.id_paciente || !formData.fecha || !formData.hora_inicio) {
      mostrarNotificacion('advertencia', 'Campos requeridos', 'Por favor completa todos los campos obligatorios');
      return;
    }

    const conflicto = verificarConflictoHorario(
      formData.fecha, 
      formData.hora_inicio, 
      formData.hora_fin,
      citaEditando?.id_cita
    );

    if (conflicto.hayConflicto) {
      mostrarNotificacion('error', 'Conflicto de horario', conflicto.mensaje);
      return;
    }

    try {
      const dataToSend = {
        id_paciente: parseInt(formData.id_paciente),
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null,
        modalidad: formData.modalidad,
        notas_previas: formData.notas_previas || null,
        url_videollamada: formData.url_videollamada || null
      };

      console.log('📤 Enviando datos al backend:', dataToSend);

      if (citaEditando) {
        const response = await api.put(`/citas/${citaEditando.id_cita}`, dataToSend);
        console.log('✅ Cita actualizada:', response);
        mostrarNotificacion('exito', 'Cita actualizada', 'La cita se actualizó correctamente');
      } else {
        const response = await api.post('/citas/', dataToSend);
        console.log('✅ Cita creada:', response);
        mostrarNotificacion('exito', 'Cita creada', 'La cita se creó correctamente');
      }

      cerrarModal();
      cargarDatos();
    } catch (error) {
      console.error('❌ Error guardando cita:', error);
      
      let mensajeError = 'No se pudo guardar la cita';
      if (error.response?.data?.detail) {
        mensajeError = error.response.data.detail;
      }
      
      mostrarNotificacion('error', 'Error', mensajeError);
    }
  };

  const eliminarCita = async (idCita) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      return;
    }

    try {
      await api.delete(`/citas/${idCita}`);
      mostrarNotificacion('exito', 'Cita eliminada', 'La cita se eliminó correctamente');
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando cita:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo eliminar la cita');
    }
  };

  const marcarAsistencia = async (idCita, asistio) => {
    try {
      await api.put(`/citas/${idCita}/asistencia`, { asistio });
      mostrarNotificacion('exito', 'Asistencia registrada', 'Se actualizó el estado de la cita');
      cargarDatos();
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo registrar la asistencia');
    }
  };

  const obtenerNombrePaciente = (idPaciente) => {
    const paciente = pacientes.find(p => p.id_usuario === idPaciente);
    if (!paciente) return 'Paciente desconocido';
    return `${paciente.nombre || 'Sin'} ${paciente.apellido || 'nombre'}`;
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const citasAgrupadas = citas.reduce((acc, cita) => {
    const fecha = cita.fecha;
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(cita);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(citasAgrupadas).sort((a, b) => new Date(a) - new Date(b));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando citas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestión de Citas</h1>
              <p className="text-gray-600">
                {citas.length} cita{citas.length !== 1 ? 's' : ''} registrada{citas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => abrirModal()}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Nueva Cita</span>
          </button>
        </div>
      </div>

      {citas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No tienes citas programadas
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primera cita para empezar a organizar tu agenda
          </p>
          <button
            onClick={() => abrirModal()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
          >
            Crear Primera Cita
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {fechasOrdenadas.map(fecha => (
            <div key={fecha} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6" />
                  <h3 className="text-xl font-bold capitalize">{formatearFecha(fecha)}</h3>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    {citasAgrupadas[fecha].length} cita{citasAgrupadas[fecha].length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {citasAgrupadas[fecha]
                  .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                  .map((cita) => (
                    <div
                      key={`cita-${cita.id_cita}`}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            <span className="text-lg font-bold text-gray-800">
                              {cita.hora_inicio}
                              {cita.hora_fin && ` - ${cita.hora_fin}`}
                            </span>
                            
                            {cita.modalidad === 'virtual' ? (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                                <Video className="w-3 h-3" />
                                <span>Virtual</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                                Presencial
                              </span>
                            )}

                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              cita.estado === 'completada' ? 'bg-green-100 text-green-800' :
                              cita.estado === 'cancelada' ? 'bg-gray-100 text-gray-600' :
                              cita.estado === 'no_asistio' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {cita.estado === 'programada' ? 'Programada' :
                               cita.estado === 'completada' ? 'Completada' :
                               cita.estado === 'cancelada' ? 'Cancelada' :
                               cita.estado === 'no_asistio' ? 'No asistió' :
                               cita.estado}
                            </span>
                          </div>

                          <div className="ml-8 space-y-2">
                            <p className="text-gray-800 font-semibold">
                              Paciente: {obtenerNombrePaciente(cita.id_paciente)}
                            </p>
                            
                            {cita.notas_previas && (
                              <p className="text-gray-600 text-sm">
                                📝 {cita.notas_previas}
                              </p>
                            )}

                            {cita.url_videollamada && (
                              <a
                                href={cita.url_videollamada}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <Video className="w-4 h-4" />
                                <span>Unirse a la videollamada</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => abrirModal(cita)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => eliminarCita(cita.id_cita)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>

                          {cita.estado === 'programada' && (
                            <>
                              <button
                                onClick={() => marcarAsistencia(cita.id_cita, true)}
                                className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-semibold"
                                title="Marcar asistencia"
                              >
                                ✓ Asistió
                              </button>
                              <button
                                onClick={() => marcarAsistencia(cita.id_cita, false)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                                title="Marcar inasistencia"
                              >
                                ✗ No asistió
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {citaEditando ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paciente *
                </label>
                <select
                  value={formData.id_paciente}
                  onChange={(e) => setFormData({...formData, id_paciente: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map(p => (
                    <option key={`paciente-option-${p.id_usuario}`} value={p.id_usuario}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
                {pacientes.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    No hay pacientes disponibles. Registra un paciente primero.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {formData.fecha && formData.hora_inicio && (() => {
                const conflicto = verificarConflictoHorario(
                  formData.fecha,
                  formData.hora_inicio,
                  formData.hora_fin,
                  citaEditando?.id_cita
                );
                return conflicto.hayConflicto && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800 font-semibold">
                        {conflicto.mensaje}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Modalidad
                </label>
                <select
                  value={formData.modalidad}
                  onChange={(e) => setFormData({...formData, modalidad: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="virtual">Virtual</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>

              {formData.modalidad === 'virtual' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    URL de videollamada
                  </label>
                  <input
                    type="url"
                    value={formData.url_videollamada}
                    onChange={(e) => setFormData({...formData, url_videollamada: e.target.value})}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notas_previas}
                  onChange={(e) => {
                    const valorCapitalizado = capitalizarTexto(e.target.value);
                    setFormData({...formData, notas_previas: valorCapitalizado});
                  }}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pacientes.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {citaEditando ? 'Actualizar' : 'Crear'} Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCitas;