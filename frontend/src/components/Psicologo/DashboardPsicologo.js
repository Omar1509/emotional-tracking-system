import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { apiCall } from '../../config/api';

const DashboardPsicologo = ({ setCurrentView }) => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const nombrePsicologo = localStorage.getItem('nombre_completo');

  useEffect(() => {
    loadPacientes();
  }, []);

  const loadPacientes = async () => {
    try {
      const response = await apiCall('/psicologos/mis-pacientes');
      setPacientes(response.pacientes || []);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pacientesConAlertas = pacientes.filter(p => p.alertas_activas > 0);
  const totalRegistrosSemana = pacientes.reduce((sum, p) => sum + p.registros_ultima_semana, 0);
  const promedioAnimo = pacientes.length > 0 
    ? (pacientes.reduce((sum, p) => sum + p.promedio_animo_7dias, 0) / pacientes.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Bienvenido, Dr(a). {nombrePsicologo}</h2>
        <p className="text-gray-600 mt-1">Panel de control profesional</p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Mis Pacientes</p>
              <p className="text-4xl font-bold mt-2">{pacientes.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Promedio Ánimo</p>
              <p className="text-4xl font-bold mt-2">{promedioAnimo}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Alertas Activas</p>
              <p className="text-4xl font-bold mt-2">{pacientesConAlertas.length}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Registros/Semana</p>
              <p className="text-4xl font-bold mt-2">{totalRegistrosSemana}</p>
            </div>
            <Clock className="w-10 h-10 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('pacientes')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all border border-blue-200 group"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Ver Pacientes</p>
              <p className="text-sm text-gray-600">Lista completa</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('registrar-paciente')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg transition-all border border-emerald-200 group"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Nuevo Paciente</p>
              <p className="text-sm text-gray-600">Registrar</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('citas')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all border border-purple-200 group"
          >
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Agenda</p>
              <p className="text-sm text-gray-600">Citas del día</p>
            </div>
          </button>
        </div>
      </div>

      {/* Alertas de Pacientes */}
      {pacientesConAlertas.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-800 mb-3">
                ⚠️ Pacientes que requieren atención
              </h4>
              <div className="space-y-2">
                {pacientesConAlertas.slice(0, 3).map(paciente => (
                  <div key={paciente.id_paciente} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{paciente.nombre_completo}</p>
                        <p className="text-sm text-gray-600">
                          {paciente.alertas_activas} alerta(s) activa(s) - Ánimo: {paciente.promedio_animo_7dias}/10
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentView('detalle-paciente');
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pacientes Recientes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No tienes pacientes asignados aún</p>
            <button
              onClick={() => setCurrentView('registrar-paciente')}
              className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
            >
              Registrar Primer Paciente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pacientes.slice(0, 5).map(paciente => (
              <div key={paciente.id_paciente} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {paciente.nombre_completo.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{paciente.nombre_completo}</p>
                    <p className="text-sm text-gray-600">
                      {paciente.registros_ultima_semana} registros esta semana
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{paciente.promedio_animo_7dias}/10</p>
                  <p className="text-xs text-gray-500">Promedio 7 días</p>
                </div>
              </div>
            ))}
            {pacientes.length > 5 && (
              <button
                onClick={() => setCurrentView('pacientes')}
                className="w-full py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
              >
                Ver todos los pacientes ({pacientes.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPsicologo;