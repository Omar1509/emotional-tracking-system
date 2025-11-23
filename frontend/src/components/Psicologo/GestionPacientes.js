// frontend/src/components/Psicologo/GestionPacientes.js
// REEMPLAZAR COMPLETAMENTE

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X, Save, AlertTriangle, MessageCircle, ChevronRight, Search, Filter } from 'lucide-react';
import API_URL from '../../config/api';
import HistorialChat from './HistorialChat';

const GestionPacientes = ({ setCurrentView, setSelectedPacienteId }) => {
  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editData, setEditData] = useState({});
  const [chatView, setChatView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  useEffect(() => {
    cargarPacientes();
  }, []);

  useEffect(() => {
    filtrarPacientes();
  }, [searchTerm, filterStatus, pacientes]);

  const cargarPacientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/psicologos/mis-pacientes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando pacientes');
      }

      const data = await response.json();
      setPacientes(data.pacientes || []);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const filtrarPacientes = () => {
    let resultado = [...pacientes];

    // Filtrar por búsqueda
    if (searchTerm) {
      resultado = resultado.filter(p => 
        p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula?.includes(searchTerm)
      );
    }

    // Filtrar por estado
    if (filterStatus === 'activos') {
      resultado = resultado.filter(p => p.activo !== false);
    } else if (filterStatus === 'alertas') {
      resultado = resultado.filter(p => p.alertas_activas > 0);
    }

    setPacientesFiltrados(resultado);
  };

  const handleEdit = (paciente) => {
    setEditingId(paciente.id_paciente);
    setEditData({
      nombre: paciente.nombre_completo.split(' ')[0],
      apellido: paciente.nombre_completo.split(' ').slice(1).join(' '),
      cedula: paciente.cedula || '',
      email: paciente.email,
      telefono: paciente.telefono || '',
      direccion: paciente.direccion || '',
      fecha_nacimiento: paciente.fecha_nacimiento || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (pacienteId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/psicologos/paciente/${pacienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar paciente');
      }

      const data = await response.json();
      console.log('✅ Paciente actualizado:', data);
      
      setEditingId(null);
      setEditData({});
      
      // Recargar pacientes
      await cargarPacientes();

      alert('Paciente actualizado exitosamente');
    } catch (error) {
      console.error('❌ Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (paciente) => {
    setDeleteConfirm(paciente);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/psicologos/paciente/${deleteConfirm.id_paciente}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar paciente');
      }

      console.log('✅ Paciente eliminado');
      setDeleteConfirm(null);
      
      // Recargar pacientes
      await cargarPacientes();

      alert(`Paciente ${deleteConfirm.nombre_completo} eliminado exitosamente`);
    } catch (error) {
      console.error('❌ Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (pacienteId) => {
    setSelectedPacienteId(pacienteId);
    setCurrentView('detalle-paciente');
  };

  // ✅ FUNCIÓN PARA VER CHAT
  const handleVerChat = (paciente) => {
    setChatView(paciente);
  };

  if (chatView) {
    return (
      <HistorialChat 
        pacienteId={chatView.id_paciente}
        nombrePaciente={chatView.nombre_completo}
        onClose={() => setChatView(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Gestión de Pacientes</h2>
        <p className="text-gray-600 mt-1">Administra la información de tus pacientes</p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="alertas">Con Alertas</option>
            </select>
          </div>
          <button
            onClick={() => setCurrentView('registrar-paciente')}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all font-semibold"
          >
            + Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">Total Pacientes</p>
          <p className="text-3xl font-bold text-blue-700">{pacientes.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 font-semibold">Activos</p>
          <p className="text-3xl font-bold text-green-700">
            {pacientes.filter(p => p.activo !== false).length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-orange-600 font-semibold">Con Alertas</p>
          <p className="text-3xl font-bold text-orange-700">
            {pacientes.filter(p => p.alertas_activas > 0).length}
          </p>
        </div>
      </div>

      {/* Lista de Pacientes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Lista de Pacientes ({pacientesFiltrados.length})
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterStatus !== 'todos' 
              ? 'No se encontraron pacientes con los filtros aplicados' 
              : 'No tienes pacientes registrados aún'}
          </div>
        ) : (
          <div className="space-y-3">
            {pacientesFiltrados.map(paciente => (
              <div
                key={paciente.id_paciente}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md"
              >
                {editingId === paciente.id_paciente ? (
                  // MODO EDICIÓN
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={editData.nombre}
                          onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                        <input
                          type="text"
                          value={editData.apellido}
                          onChange={(e) => setEditData({ ...editData, apellido: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                        <input
                          type="text"
                          value={editData.cedula}
                          onChange={(e) => setEditData({ ...editData, cedula: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input
                          type="tel"
                          value={editData.telefono}
                          onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input
                          type="text"
                          value={editData.direccion}
                          onChange={(e) => setEditData({ ...editData, direccion: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleSaveEdit(paciente.id_paciente)}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>Guardar</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // MODO VISTA
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {paciente.nombre_completo.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <button
                          onClick={() => handleVerDetalle(paciente.id_paciente)}
                          className="font-semibold text-gray-800 hover:text-blue-600 transition-colors text-left"
                        >
                          {paciente.nombre_completo}
                        </button>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          {paciente.cedula && (
                            <span>🆔 {paciente.cedula}</span>
                          )}
                          {paciente.email && (
                            <span>✉️ {paciente.email}</span>
                          )}
                          {paciente.telefono && (
                            <span>📞 {paciente.telefono}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {paciente.registros_ultima_semana} registros esta semana • Ánimo: {paciente.promedio_animo_7dias}/10
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* ✅ BOTÓN VER CHAT */}
                      <button
                        onClick={() => handleVerChat(paciente)}
                        className="flex items-center space-x-1 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all border border-purple-200"
                        title="Ver historial de chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Ver Chat</span>
                      </button>
                      
                      <button
                        onClick={() => handleEdit(paciente)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar paciente"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(paciente)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar paciente"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleVerDetalle(paciente.id_paciente)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                        title="Ver detalle completo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">¿Eliminar Paciente?</h3>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                Estás a punto de eliminar a:
              </p>
              <p className="font-semibold text-gray-900">
                {deleteConfirm.nombre_completo}
              </p>
              {deleteConfirm.cedula && (
                <p className="text-sm text-gray-600">Cédula: {deleteConfirm.cedula}</p>
              )}
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ Se eliminará toda la información del paciente
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionPacientes;