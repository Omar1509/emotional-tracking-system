// frontend/src/components/Psicologo/GestionPacientes.js
// ✅ VERSIÓN CORREGIDA - Optional Chaining para evitar errores de undefined

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Eye, TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const GestionPacientes = ({ setCurrentView, setSelectedPacienteId }) => {
  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, activos, inactivos
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);

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
      
      // ✅ FIX: Asegurar que siempre sea un array
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

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(paciente => {
        // ✅ FIX: Optional chaining en todas las propiedades
        const nombreCompleto = `${paciente.nombre || ''} ${paciente.apellido || ''}`.toLowerCase();
        const cedula = (paciente.cedula || '').toLowerCase();
        const email = (paciente.email || '').toLowerCase();
        
        return nombreCompleto.includes(searchLower) || 
               cedula.includes(searchLower) || 
               email.includes(searchLower);
      });
    }

    // Filtrar por estado
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

  const obtenerTendenciaEmocional = (paciente) => {
    // ✅ FIX: Manejar casos donde no hay datos
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
    // ✅ FIX: Manejar undefined/null
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
          {/* Barra de búsqueda */}
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

          {/* Filtro por estado */}
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
            // ✅ FIX: Calcular promedio con validación
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
                      {/* ✅ FIX CRÍTICO: Optional chaining */}
                      {paciente.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {/* ✅ FIX: Manejar nombre y apellido undefined */}
                        {paciente.nombre || 'Sin'} {paciente.apellido || 'nombre'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {/* ✅ FIX: Manejar cedula undefined */}
                        {paciente.cedula || 'Sin cédula'}
                      </p>
                    </div>
                  </div>

                  {/* Badge de estado */}
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
                      {/* ✅ FIX: Manejar email undefined */}
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
                      {/* ✅ FIX: Manejar edad undefined */}
                      {paciente.edad || 'N/A'} años
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Registros:</span>
                    <span className="font-medium text-gray-800">
                      {/* ✅ FIX: Manejar array undefined */}
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

                {/* Botón ver detalles */}
                <button
                  onClick={() => verDetallePaciente(paciente.id_usuario)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Eye className="w-5 h-5" />
                  <span className="font-semibold">Ver Detalles</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GestionPacientes;