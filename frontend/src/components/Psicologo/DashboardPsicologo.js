// frontend/src/components/Psicologo/DashboardPsicologo.js
// ✅ VERSIÓN CORREGIDA - Fix de keys en el map

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertTriangle, Activity, Eye, Plus } from 'lucide-react';
import { api } from '../../config/api';

const DashboardPsicologo = ({ setCurrentView, setSelectedPacienteId }) => {
  const [estadisticas, setEstadisticas] = useState({
    totalPacientes: 0,
    promedioAnimo: 0,
    alertasActivas: 0,
    registrosSemanales: 0
  });
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/psicologos/mis-pacientes');
      
      const pacientesData = Array.isArray(response.pacientes) ? response.pacientes : [];
      setPacientes(pacientesData);

      const totalPacientes = pacientesData.length;
      
      const pacientesConRegistros = pacientesData.filter(p => 
        Array.isArray(p.registros_emocionales) && p.registros_emocionales.length > 0
      );

      const promedioAnimo = pacientesConRegistros.length > 0
        ? pacientesConRegistros.reduce((sum, p) => {
            const registros = p.registros_emocionales || [];
            if (registros.length === 0) return sum;
            const promedioP = registros.reduce((s, r) => s + (r.nivel_animo || 5), 0) / registros.length;
            return sum + promedioP;
          }, 0) / pacientesConRegistros.length
        : 0;

      const alertasActivas = pacientesConRegistros.reduce((count, p) => {
        const ultimoRegistro = p.registros_emocionales?.[p.registros_emocionales.length - 1];
        return ultimoRegistro && (ultimoRegistro.nivel_animo || 10) <= 4 ? count + 1 : count;
      }, 0);

      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      const registrosSemanales = pacientesData.reduce((count, p) => {
        const registrosRecientes = (p.registros_emocionales || []).filter(r => 
          r.fecha_hora && new Date(r.fecha_hora) >= hace7Dias
        );
        return count + registrosRecientes.length;
      }, 0);

      setEstadisticas({
        totalPacientes,
        promedioAnimo: promedioAnimo.toFixed(1),
        alertasActivas,
        registrosSemanales
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      setPacientes([]);
      setEstadisticas({
        totalPacientes: 0,
        promedioAnimo: 0,
        alertasActivas: 0,
        registrosSemanales: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const obtenerColorAnimo = (promedio) => {
    if (promedio === undefined || promedio === null || isNaN(promedio)) {
      return 'text-gray-400';
    }
    if (promedio <= 4) return 'text-red-500';
    if (promedio <= 6) return 'text-orange-500';
    if (promedio <= 8) return 'text-yellow-500';
    return 'text-green-500';
  };

  const verDetallePaciente = (pacienteId) => {
    setSelectedPacienteId(pacienteId);
    setCurrentView('detalle-paciente');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Dashboard del Psicólogo
        </h1>
        <p className="text-gray-600">Resumen general de tus pacientes</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total de Pacientes */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Pacientes</p>
              <p className="text-4xl font-bold text-gray-800">{estadisticas.totalPacientes}</p>
            </div>
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Promedio de Ánimo */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Promedio de Ánimo</p>
              <p className="text-4xl font-bold text-gray-800">
                {estadisticas.promedioAnimo}
                <span className="text-xl text-gray-600">/10</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Alertas Activas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Alertas Activas</p>
              <p className="text-4xl font-bold text-gray-800">{estadisticas.alertasActivas}</p>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Registros Semanales */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Registros/Semana</p>
              <p className="text-4xl font-bold text-gray-800">{estadisticas.registrosSemanales}</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Botón Registrar Paciente */}
      <div className="mb-8">
        <button
          onClick={() => setCurrentView('registrar-paciente')}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Registrar Nuevo Paciente</span>
        </button>
      </div>

      {/* Lista de pacientes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Mis Pacientes</h2>
          <button
            onClick={() => setCurrentView('pacientes')}
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Ver todos →
          </button>
        </div>

        {pacientes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No tienes pacientes registrados
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza registrando tu primer paciente
            </p>
            <button
              onClick={() => setCurrentView('registrar-paciente')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
            >
              Registrar Paciente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pacientes.slice(0, 5).map((paciente) => {
              // ✅ FIX: Calcular promedio con validación completa
              const registros = Array.isArray(paciente.registros_emocionales) ? paciente.registros_emocionales : [];
              const promedio = registros.length > 0
                ? (registros.reduce((sum, r) => sum + (r.nivel_animo || 5), 0) / registros.length).toFixed(1)
                : null;

              return (
                <div
                  key={`paciente-${paciente.id_usuario}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {paciente.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {paciente.nombre || 'Sin'} {paciente.apellido || 'nombre'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {registros.length} registro{registros.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {promedio !== null ? (
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Promedio</p>
                        <p className={`text-2xl font-bold ${obtenerColorAnimo(parseFloat(promedio))}`}>
                          {promedio}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Promedio</p>
                        <p className="text-2xl font-bold text-gray-400">N/A</p>
                      </div>
                    )}

                    <button
                      onClick={() => verDetallePaciente(paciente.id_usuario)}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPsicologo;