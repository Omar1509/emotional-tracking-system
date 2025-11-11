import React, { useState, useEffect } from 'react';
import { Users, User, BarChart3, Plus, TrendingUp, AlertCircle, Mail, Phone } from 'lucide-react';
import { apiCall } from '../../config/api';

const DashboardAdmin = ({ setCurrentView }) => {
  const [stats, setStats] = useState(null);
  const [psicologos, setPsicologos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPsicologos, setLoadingPsicologos] = useState(true);

  useEffect(() => {
    loadStats();
    loadPsicologos();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiCall('/admin/estadisticas');
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPsicologos = async () => {
    try {
      const data = await apiCall('/admin/psicologos');
      setPsicologos(data.psicologos || []);
    } catch (error) {
      console.error('Error cargando psicólogos:', error);
    } finally {
      setLoadingPsicologos(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Panel de Administración</h2>
        <p className="text-gray-600 mt-1">Vista general del sistema</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Pacientes Activos</p>
                <p className="text-4xl font-bold mt-2">{stats.total_pacientes_activos}</p>
                <p className="text-emerald-100 text-xs mt-2">Total en el sistema</p>
              </div>
              <Users className="w-12 h-12 text-emerald-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Psicólogos Activos</p>
                <p className="text-4xl font-bold mt-2">{stats.total_psicologos_activos}</p>
                <p className="text-blue-100 text-xs mt-2">Profesionales registrados</p>
              </div>
              <User className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Registros Totales</p>
                <p className="text-4xl font-bold mt-2">{stats.total_registros_emocionales}</p>
                <p className="text-purple-100 text-xs mt-2">Estados emocionales</p>
              </div>
              <BarChart3 className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-emerald-600" />
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('registrar-psicologo')}
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 hover:from-emerald-100 hover:to-blue-100 rounded-lg transition-all border border-emerald-200 group"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Registrar Psicólogo</p>
              <p className="text-sm text-gray-600">Agregar nuevo profesional al sistema</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-lg transition-all border border-blue-200 group">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Ver Reportes</p>
              <p className="text-sm text-gray-600">Estadísticas detalladas del sistema</p>
            </div>
          </button>
        </div>
      </div>

      {/* SECCIÓN DE PSICÓLOGOS REGISTRADOS */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <User className="w-6 h-6 mr-2 text-blue-600" />
          Psicólogos Registrados
        </h3>
        
        {loadingPsicologos ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Cargando psicólogos...</p>
          </div>
        ) : psicologos.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay psicólogos registrados aún</p>
            <button
              onClick={() => setCurrentView('registrar-psicologo')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Registrar el primero →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {psicologos.map((psicologo) => (
              <div
                key={psicologo.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {psicologo.nombre_completo}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">{psicologo.especialidad || 'Psicología General'}</p>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-gray-600">
                        <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{psicologo.email}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>{psicologo.telefono}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        psicologo.activo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {psicologo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {psicologo.total_pacientes || 0} pacientes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">Nota de Privacidad</h4>
            <p className="text-yellow-700 text-sm leading-relaxed">
              Como administrador, tienes acceso a estadísticas generales del sistema pero <strong>no puedes ver datos sensibles de los pacientes</strong> (registros emocionales, notas de sesiones, historial de chat). Solo los psicólogos asignados tienen acceso a esta información confidencial.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-800">Sistema funcionando correctamente</p>
              <p className="text-xs text-gray-500">Última verificación: hace 2 minutos</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-800">Base de datos actualizada</p>
              <p className="text-xs text-gray-500">Última sincronización: hace 5 minutos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;