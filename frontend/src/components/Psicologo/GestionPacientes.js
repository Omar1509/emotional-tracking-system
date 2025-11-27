// frontend/src/components/Psicologo/GestionPacientes.js
// ✅ VERSIÓN CORREGIDA CON EDITAR Y BORRAR

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Eye, TrendingUp, TrendingDown, Minus, ArrowLeft, Edit2, Trash2, X, Save } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const GestionPacientes = ({ setCurrentView, setSelectedPacienteId }) => {
  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  
  // Estados para edición
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [formEditar, setFormEditar] = useState({});
  const [guardando, setGuardando] = useState(false);
  
  // Estados para confirmación de eliminación
  const [pacienteEliminar, setPacienteEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargarPacientes();
  }, []);

  useEffect(() => {
    filtrarPacientes();
  }, [busqueda, filtroEstado, pacientes]);

  const cargarPacientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/psicologos/mis-pacientes');
      
      const pacientesData = Array.isArray(response.pacientes) ? response.pacientes : [];
      setPacientes(pacientesData);
      setPacientesFiltrados(pacientesData);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar los pacientes');
      setPacientes([]);
      setPacientesFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrarPacientes = () => {
    let resultado = [...pacientes];

    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(paciente => {
        const nombreCompleto = `${paciente.nombre || ''} ${paciente.apellido || ''}`.toLowerCase();
        const cedula = (paciente.cedula || '').toLowerCase();
        const email = (paciente.email || '').toLowerCase();
        
        return nombreCompleto.includes(searchLower) || 
               cedula.includes(searchLower) || 
               email.includes(searchLower);
      });
    }

    if (filtroEstado !== 'todos') {
      const estadoBooleano = filtroEstado === 'activos';
      resultado = resultado.filter(p => p.activo === estadoBooleano);
    }

    setPacientesFiltrados(resultado);
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const verDetallePaciente = (pacienteId) => {
    setSelectedPacienteId(pacienteId);
    setCurrentView('detalle-paciente');
  };

  // ==================== EDITAR PACIENTE ====================
  
  const abrirModalEditar = (paciente) => {
    setPacienteEditando(paciente.id_usuario);
    setFormEditar({
      nombre: paciente.nombre || '',
      apellido: paciente.apellido || '',
      email: paciente.email || '',
      telefono: paciente.telefono || '',
      cedula: paciente.cedula || '',
      direccion: paciente.direccion || '',
      fecha_nacimiento: paciente.fecha_nacimiento || '',
      genero: paciente.genero || '',
      activo: paciente.activo
    });
  };

  const cerrarModalEditar = () => {
    setPacienteEditando(null);
    setFormEditar({});
  };

  const guardarCambios = async () => {
    if (!formEditar.nombre || !formEditar.apellido || !formEditar.email) {
      mostrarNotificacion('advertencia', 'Campos incompletos', 'Nombre, apellido y email son obligatorios');
      return;
    }

    try {
      setGuardando(true);
      await api.put(`/psicologos/paciente/${pacienteEditando}`, formEditar);
      mostrarNotificacion('exito', 'Éxito', 'Paciente actualizado correctamente');
      cerrarModalEditar();
      cargarPacientes();
    } catch (error) {
      console.error('Error actualizando paciente:', error);
      mostrarNotificacion('error', 'Error', error.response?.data?.detail || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  // ==================== ELIMINAR PACIENTE ====================
  
  const confirmarEliminar = (paciente) => {
    setPacienteEliminar(paciente);
  };

  const cancelarEliminar = () => {
    setPacienteEliminar(null);
  };

  const eliminarPaciente = async () => {
    try {
      setEliminando(true);
      await api.delete(`/psicologos/paciente/${pacienteEliminar.id_usuario}`);
      mostrarNotificacion('exito', 'Éxito', 'Paciente eliminado correctamente');
      setPacienteEliminar(null);
      cargarPacientes();
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      mostrarNotificacion('error', 'Error', error.response?.data?.detail || 'No se pudo eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const obtenerTendenciaEmocional = (paciente) => {
    if (!paciente.registros_emocionales || paciente.registros_emocionales.length < 2) {
      return { icono: <Minus className="w-5 h-5" />, color: 'text-gray-400', texto: 'Sin datos' };
    }

    const ultimosRegistros = paciente.registros_emocionales.slice(-5);
    const promedioReciente = ultimosRegistros.reduce((sum, r) => sum + (r.nivel_animo || 5), 0) / ultimosRegistros.length;
    const registrosAnteriores = paciente.registros_emocionales.slice(-10, -5);
    
    if (registrosAnteriores.length === 0) {
      return { icono: <Minus className="w-5 h-5" />, color: 'text-gray-400', texto: 'Sin datos' };
    }

    const promedioAnterior = registrosAnteriores.reduce((sum, r) => sum + (r.nivel_animo || 5), 0) / registrosAnteriores.length;

    if (promedioReciente > promedioAnterior + 0.5) {
      return { icono: <TrendingUp className="w-5 h-5" />, color: 'text-green-500', texto: 'Mejorando' };
    } else if (promedioReciente < promedioAnterior - 0.5) {
      return { icono: <TrendingDown className="w-5 h-5" />, color: 'text-red-500', texto: 'Empeorando' };
    } else {
      return { icono: <Minus className="w-5 h-5" />, color: 'text-yellow-500', texto: 'Estable' };
    }
  };

  const obtenerColorEstadoEmocional = (nivel) => {
    if (nivel === undefined || nivel === null) return 'bg-gray-100 text-gray-600';
    if (nivel <= 3) return 'bg-red-100 text-red-800';
    if (nivel <= 5) return 'bg-orange-100 text-orange-800';
    if (nivel <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando pacientes...</p>
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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Pacientes</h1>
            <p className="text-gray-600">
              {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} en total
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('registrar-paciente')}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-semibold">Registrar Nuevo Paciente</span>
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtroEstado === 'todos'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({pacientes.length})
            </button>
            <button
              onClick={() => setFiltroEstado('activos')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtroEstado === 'activos'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Activos ({pacientes.filter(p => p.activo).length})
            </button>
            <button
              onClick={() => setFiltroEstado('inactivos')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                filtroEstado === 'inactivos'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactivos ({pacientes.filter(p => !p.activo).length})
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pacientes */}
      {pacientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No se encontraron pacientes
          </h3>
          <p className="text-gray-600">
            {busqueda ? 'Intenta con otros términos de búsqueda' : 'No tienes pacientes registrados aún'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pacientesFiltrados.map((paciente) => {
            const tendencia = obtenerTendenciaEmocional(paciente);
            const promedioAnimo = paciente.registros_emocionales && paciente.registros_emocionales.length > 0
              ? (paciente.registros_emocionales.reduce((sum, r) => sum + (r.nivel_animo || 5), 0) / paciente.registros_emocionales.length).toFixed(1)
              : 'N/A';

            return (
              <div
                key={paciente.id_usuario}
                className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-l-4 ${
                  paciente.activo ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                {/* Avatar y nombre */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {paciente.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {paciente.nombre || 'Sin'} {paciente.apellido || 'nombre'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {paciente.cedula || 'Sin cédula'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    paciente.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {paciente.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Información del paciente */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-800 truncate ml-2">
                      {paciente.email || 'Sin email'}
                    </span>
                  </div>

                  {paciente.telefono && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="font-medium text-gray-800">
                        {paciente.telefono}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Edad:</span>
                    <span className="font-medium text-gray-800">
                      {paciente.edad || 'N/A'} años
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Registros:</span>
                    <span className="font-medium text-gray-800">
                      {paciente.registros_emocionales?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Estado emocional */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Estado Emocional</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${obtenerColorEstadoEmocional(promedioAnimo === 'N/A' ? null : parseFloat(promedioAnimo))}`}>
                      {promedioAnimo === 'N/A' ? 'Sin datos' : `${promedioAnimo}/10`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={tendencia.color}>
                      {tendencia.icono}
                    </span>
                    <span className={`text-sm font-medium ${tendencia.color}`}>
                      {tendencia.texto}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => verDetallePaciente(paciente.id_usuario)}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-semibold">Ver</span>
                  </button>

                  <button
                    onClick={() => abrirModalEditar(paciente)}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Editar</span>
                  </button>

                  <button
                    onClick={() => confirmarEliminar(paciente)}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Borrar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar */}
      {pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Editar Paciente</h2>
              <button
                onClick={cerrarModalEditar}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Información Personal */}
              <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-indigo-900 mb-3">📋 Información Personal</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formEditar.nombre}
                      onChange={(e) => setFormEditar({...formEditar, nombre: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Juan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      value={formEditar.apellido}
                      onChange={(e) => setFormEditar({...formEditar, apellido: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cédula (No editable)
                    </label>
                    <input
                      type="text"
                      value={formEditar.cedula}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      placeholder="Sin cédula registrada"
                    />
                    <p className="text-xs text-gray-500 mt-1">🔒 La cédula no se puede modificar por seguridad</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={formEditar.fecha_nacimiento}
                      onChange={(e) => setFormEditar({...formEditar, fecha_nacimiento: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Género
                    </label>
                    <select
                      value={formEditar.genero}
                      onChange={(e) => setFormEditar({...formEditar, genero: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                      <option value="prefiero_no_decir">Prefiero no decir</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      value={formEditar.activo ? 'activo' : 'inactivo'}
                      onChange={(e) => setFormEditar({...formEditar, activo: e.target.value === 'activo'})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="activo">✅ Activo</option>
                      <option value="inactivo">❌ Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-blue-900 mb-3">📞 Información de Contacto</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formEditar.email}
                      onChange={(e) => setFormEditar({...formEditar, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: correo@ejemplo.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">ℹ️ El email es solo para contacto, NO afecta el usuario de login</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formEditar.telefono}
                      onChange={(e) => setFormEditar({...formEditar, telefono: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: 0987654321"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dirección
                    </label>
                    <textarea
                      value={formEditar.direccion}
                      onChange={(e) => setFormEditar({...formEditar, direccion: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Av. Principal #123, Centro, Guayaquil"
                    />
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Importante:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Los campos marcados con (*) son obligatorios</li>
                  <li>La cédula no se puede editar por seguridad</li>
                  <li>El email es solo para contacto, NO cambia el usuario de login</li>
                  <li>La contraseña no se puede editar desde aquí</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={cerrarModalEditar}
                disabled={guardando}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-semibold disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {pacienteEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar Paciente?
              </h2>
              <p className="text-gray-600">
                ¿Estás seguro de que deseas eliminar a{' '}
                <span className="font-bold">
                  {pacienteEliminar.nombre} {pacienteEliminar.apellido}
                </span>?
              </p>
              <p className="text-red-600 text-sm mt-2">
                ⚠️ Esta acción no se puede deshacer y eliminará todos los registros asociados.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelarEliminar}
                disabled={eliminando}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarPaciente}
                disabled={eliminando}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionPacientes;