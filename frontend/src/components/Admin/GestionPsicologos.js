// frontend/src/components/Admin/GestionPsicologos.js
// ✅ Gestión completa de psicólogos para el administrador

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Search, Filter, Plus, Eye, Power, CheckCircle, XCircle } from 'lucide-react';
import { apiCall } from '../../config/api';

const GestionPsicologos = ({ setCurrentView, setSelectedPsicologoId }) => {
  const [psicologos, setPsicologos] = useState([]);
  const [psicologosFiltrados, setPsicologosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, activos, inactivos

  useEffect(() => {
    cargarPsicologos();
  }, []);

  useEffect(() => {
    filtrarPsicologos();
  }, [searchTerm, filtroEstado, psicologos]);

  const cargarPsicologos = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/psicologos');
      setPsicologos(data.psicologos || []);
    } catch (error) {
      console.error('Error cargando psicólogos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarPsicologos = () => {
    let filtered = [...psicologos];

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre_completo?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.telefono?.includes(term) ||
        p.especialidad?.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (filtroEstado === 'activos') {
      filtered = filtered.filter(p => p.activo);
    } else if (filtroEstado === 'inactivos') {
      filtered = filtered.filter(p => !p.activo);
    }

    setPsicologosFiltrados(filtered);
  };

  const toggleEstado = async (psicologoId, estadoActual) => {
    try {
      await apiCall(`/admin/psicologos/${psicologoId}/toggle-estado`, {
        method: 'PUT'
      });
      
      // Actualizar lista local
      setPsicologos(psicologos.map(p => 
        p.id === psicologoId 
          ? { ...p, activo: !estadoActual }
          : p
      ));
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del psicólogo');
    }
  };

  const verDetalle = (psicologoId) => {
    setSelectedPsicologoId(psicologoId);
    setCurrentView('detalle-psicologo');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando psicólogos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Psicólogos</h2>
          <p className="text-gray-600 mt-1">Administra los profesionales del sistema</p>
        </div>
        <button
          onClick={() => setCurrentView('registrar-psicologo')}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Registrar Psicólogo</span>
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-blue-600 text-sm font-medium">Total</p>
          <p className="text-3xl font-bold text-blue-700">{psicologos.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-green-600 text-sm font-medium">Activos</p>
          <p className="text-3xl font-bold text-green-700">
            {psicologos.filter(p => p.activo).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Inactivos</p>
          <p className="text-3xl font-bold text-gray-700">
            {psicologos.filter(p => !p.activo).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <p className="text-purple-600 text-sm font-medium">Con Pacientes</p>
          <p className="text-3xl font-bold text-purple-700">
            {psicologos.filter(p => p.total_pacientes > 0).length}
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono o especialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por estado */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="todos">Todos los psicólogos</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
            </select>
          </div>
        </div>

        {searchTerm || filtroEstado !== 'todos' ? (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando {psicologosFiltrados.length} de {psicologos.length} psicólogos
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroEstado('todos');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>

      {/* Lista de psicólogos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {psicologosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm || filtroEstado !== 'todos' 
                ? 'No se encontraron psicólogos con los filtros aplicados'
                : 'No hay psicólogos registrados aún'}
            </p>
            {!searchTerm && filtroEstado === 'todos' && (
              <button
                onClick={() => setCurrentView('registrar-psicologo')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Registrar el primero →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Psicólogo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Especialidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Pacientes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {psicologosFiltrados.map((psicologo) => (
                  <tr key={psicologo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {psicologo.nombre_completo?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {psicologo.nombre_completo}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {psicologo.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="truncate max-w-xs">{psicologo.email}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{psicologo.telefono}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">
                        {psicologo.especialidad || 'General'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-semibold text-gray-700">
                          {psicologo.total_pacientes || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        psicologo.activo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {psicologo.activo ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => verDetalle(psicologo.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleEstado(psicologo.id, psicologo.activo)}
                          className={`p-2 rounded-lg transition-colors ${
                            psicologo.activo
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={psicologo.activo ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionPsicologos;