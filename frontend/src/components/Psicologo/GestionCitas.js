// frontend/src/components/Psicologo/GestionCitas.js
// COMPONENTE NUEVO - Sistema completo de citas médicas

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, X, Save, Clock, Video, MapPin, Check, XCircle } from 'lucide-react';
import API_URL from '../../config/api';

const GestionCitas = ({ setCurrentView }) => {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    id_paciente: '',
    fecha: '',
    hora_inicio: '',
    duracion_minutos: 60,
    modalidad: 'virtual',
    url_videollamada: '',
    notas_previas: '',
    objetivos: ''
  });

  useEffect(() => {
    cargarCitas();
    cargarPacientes();
  }, []);

  const cargarCitas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/psicologos/mis-citas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCitas(data.citas || []);
      }
    } catch (error) {
      console.error('Error cargando citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPacientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/psicologos/mis-pacientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPacientes(data.pacientes || []);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    }
  };

  const handleNuevaCita = () => {
    setFormData({
      id_paciente: '',
      fecha: '',
      hora_inicio: '',
      duracion_minutos: 60,
      modalidad: 'virtual',
      url_videollamada: '',
      notas_previas: '',
      objetivos: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/psicologos/citas/${editingId}`
        : `${API_URL}/psicologos/citas`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error guardando cita');
      }

      alert(editingId ? 'Cita actualizada' : 'Cita creada exitosamente');
      setShowModal(false);
      cargarCitas();
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarCita = async (citaId) => {
    if (!window.confirm('¿Está seguro de cancelar esta cita?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/psicologos/citas/${citaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Cita cancelada');
        cargarCitas();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error cancelando cita');
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'programada': 'bg-blue-100 text-blue-800',
      'completada': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800',
      'no_asistio': 'bg-gray-100 text-gray-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      'programada': <Clock className="w-4 h-4" />,
      'completada': <Check className="w-4 h-4" />,
      'cancelada': <XCircle className="w-4 h-4" />,
      'no_asistio': <X className="w-4 h-4" />
    };
    return icons[estado] || <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Citas</h2>
          <p className="text-gray-600 mt-1">Programa y administra sesiones con tus pacientes</p>
        </div>
        <button
          onClick={handleNuevaCita}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Cita</span>
        </button>
      </div>

      {/* Lista de Citas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No hay citas programadas</p>
            <button
              onClick={handleNuevaCita}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Programar Primera Cita
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {citas.map(cita => (
              <div
                key={cita.id_cita}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {cita.paciente.nombre}
                      </h3>
                      <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(cita.estado)}`}>
                        {getEstadoIcon(cita.estado)}
                        <span className="capitalize">{cita.estado.replace('_', ' ')}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(cita.fecha).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{cita.hora_inicio} ({cita.duracion_minutos} min)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {cita.modalidad === 'virtual' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                        <span className="capitalize">{cita.modalidad}</span>
                      </div>
                    </div>

                    {cita.notas_previas && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{cita.notas_previas}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {cita.estado === 'programada' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(cita.id_cita);
                            setFormData({
                              ...cita,
                              hora_inicio: cita.hora_inicio.substring(0, 5)
                            });
                            setShowModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCancelarCita(cita.id_cita)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Nueva/Editar Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl">
              <h3 className="text-2xl font-bold">
                {editingId ? 'Editar Cita' : 'Nueva Cita'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Paciente */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paciente *
                  </label>
                  <select
                    value={formData.id_paciente}
                    onChange={(e) => setFormData({ ...formData, id_paciente: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar paciente...</option>
                    {pacientes.map(p => (
                      <option key={p.id_paciente} value={p.id_paciente}>
                        {p.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duración y Modalidad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.duracion_minutos}
                    onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidad
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="virtual">Virtual</option>
                    <option value="presencial">Presencial</option>
                    <option value="telefonica">Telefónica</option>
                  </select>
                </div>
              </div>

              {/* URL Videollamada */}
              {formData.modalidad === 'virtual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Videollamada
                  </label>
                  <input
                    type="url"
                    value={formData.url_videollamada}
                    onChange={(e) => setFormData({ ...formData, url_videollamada: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Previas
                </label>
                <textarea
                  value={formData.notas_previas}
                  onChange={(e) => setFormData({ ...formData, notas_previas: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Temas a tratar, preparación necesaria..."
                />
              </div>

              {/* Objetivos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivos de la Sesión
                </label>
                <textarea
                  value={formData.objetivos}
                  onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Objetivos terapéuticos para esta sesión..."
                />
              </div>

              {/* Botones */}
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : editingId ? 'Actualizar Cita' : 'Crear Cita'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancelar
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