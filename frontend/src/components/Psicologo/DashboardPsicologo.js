// frontend/src/components/Psicologo/DashboardPsicologo.js

import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, TrendingUp, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import API_URL from '../../config/api';

const DashboardPsicologo = ({ setCurrentView, setSelectedPacienteId }) => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Obtener información del usuario desde localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  
  // Construir nombre completo del psicólogo
  const nombrePsicologo = user.nombre && user.apellido 
    ? `${user.nombre} ${user.apellido}`
    : localStorage.getItem('nombre_completo') || 'Psicólogo';

  useEffect(() => {
    loadPacientes();
  }, []);

  const loadPacientes = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Cargando pacientes...');
      
      const response = await fetch(`${API_URL}/psicologos/mis-pacientes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando pacientes');
      }

      const data = await response.json();
      console.log('📊 Pacientes cargados:', data);
      setPacientes(data.pacientes || []);
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetallePaciente = (pacienteId) => {
    console.log('👁️ Ver detalle del paciente:', pacienteId);
    setSelectedPacienteId(pacienteId);
    setCurrentView('detalle-paciente');
  };

  // Se asegura que pacientes sea un arreglo antes de usar filter/reduce
  const safePacientes = pacientes || [];
  
  const pacientesConAlertas = safePacientes.filter(p => p.alertas_activas > 0);
  const totalRegistrosSemana = safePacientes.reduce((sum, p) => sum + (p.registros_ultima_semana || 0), 0);
  
  const promedioAnimo = safePacientes.length > 0 
    ? (safePacientes.reduce((sum, p) => sum + (p.promedio_animo_7dias || 0), 0) / safePacientes.length).toFixed(1)
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
              <p className="text-4xl font-bold mt-2">{safePacientes.length}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('registrar-paciente')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg transition-all border border-emerald-200 group"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Nuevo Paciente</p>
              <p className="text-sm text-gray-600">Registrar un nuevo paciente</p>
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
              <p className="text-sm text-gray-600">Ver citas programadas</p>
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
                        <p className="font-semibold text-gray-800">{paciente.nombre_completo || 'Paciente Desconocido'}</p>
                        <p className="text-sm text-gray-600">
                          {paciente.alertas_activas} alerta(s) activa(s) - Ánimo: {paciente.promedio_animo_7dias}/10
                        </p>
                      </div>
                      <button
                        onClick={() => verDetallePaciente(paciente.id_paciente)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm flex items-center space-x-2"
                      >
                        <span>Ver Detalles</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Pacientes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Mis Pacientes</h3>
          {safePacientes.length > 0 && (
            <span className="text-sm text-gray-500">{safePacientes.length} paciente(s)</span>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : safePacientes.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No tienes pacientes asignados aún</p>
            <button
              onClick={() => setCurrentView('registrar-paciente')}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
            >
              Registrar Primer Paciente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {safePacientes.map(paciente => (
              <button
                key={paciente.id_paciente}
                onClick={() => verDetallePaciente(paciente.id_paciente)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                    {/* CORRECCIÓN: Usar encadenamiento opcional y fallback */}
                    {paciente.nombre_completo?.charAt(0) || '?'} 
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {paciente.nombre_completo || 'Paciente Desconocido'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(paciente.registros_ultima_semana || 0)} registros esta semana
                      {paciente.email && ` • ${paciente.email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{(paciente.promedio_animo_7dias || 0)}/10</p>
                    <p className="text-xs text-gray-500">Promedio 7 días</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPsicologo;