// frontend/src/components/Admin/ReportesAdmin.js
// ✅ Reportes y estadísticas completas para el administrador

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Activity, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiCall } from '../../config/api';

const ReportesAdmin = () => {
  const [reporteGeneral, setReporteGeneral] = useState(null);
  const [reportePsicologos, setReportePsicologos] = useState(null);
  const [resumenUsuarios, setResumenUsuarios] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(30);

  useEffect(() => {
    cargarReportes();
  }, [periodoSeleccionado]);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      
      const [general, psicologos, usuarios] = await Promise.all([
        apiCall(`/admin/reportes/general?dias=${periodoSeleccionado}`),
        apiCall('/admin/reportes/psicologos'),
        apiCall('/admin/usuarios/resumen')
      ]);
      
      setReporteGeneral(general);
      setReportePsicologos(psicologos);
      setResumenUsuarios(usuarios);
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    primary: '#10b981',
    secondary: '#3b82f6',
    tertiary: '#8b5cf6',
    quaternary: '#f59e0b',
    quinary: '#ef4444',
    alegria: '#10b981',
    tristeza: '#3b82f6',
    enojo: '#ef4444',
    miedo: '#8b5cf6',
    ansiedad: '#f59e0b',
    neutral: '#6b7280'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const emocionesData = reporteGeneral ? Object.entries(reporteGeneral.distribucion_emociones).map(([nombre, valor]) => ({
    nombre,
    valor,
    color: COLORS[nombre.toLowerCase()] || COLORS.neutral
  })) : [];

  const riesgosData = reporteGeneral ? Object.entries(reporteGeneral.distribucion_riesgos).map(([nivel, total]) => ({
    nivel,
    total
  })) : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h2>
          <p className="text-gray-600 mt-1">Análisis completo del sistema</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 6 meses</option>
          </select>
        </div>
      </div>

      {/* Resumen de Usuarios */}
      {resumenUsuarios && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Pacientes</p>
                <p className="text-4xl font-bold mt-2">{resumenUsuarios.por_rol.PACIENTE || 0}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Psicólogos</p>
                <p className="text-4xl font-bold mt-2">{resumenUsuarios.por_rol.PSICOLOGO || 0}</p>
              </div>
              <Users className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Usuarios Activos</p>
                <p className="text-4xl font-bold mt-2">{resumenUsuarios.por_estado.activos || 0}</p>
              </div>
              <Activity className="w-12 h-12 text-emerald-200" />
            </div>
          </div>
        </div>
      )}

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Emociones */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-emerald-600" />
            Distribución de Emociones
          </h3>
          
          {emocionesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emocionesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#10b981">
                  {emocionesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hay datos de emociones para este período
            </div>
          )}
        </div>

        {/* Niveles de Riesgo */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
            Niveles de Riesgo
          </h3>
          
          {riesgosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riesgosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nivel, total }) => `${nivel}: ${total}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {riesgosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.nivel === 'ALTO' ? '#ef4444' :
                      entry.nivel === 'MODERADO' ? '#f59e0b' :
                      '#10b981'
                    } />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hay datos de riesgo para este período
            </div>
          )}
        </div>
      </div>

      {/* Actividad de Registros */}
      {reporteGeneral && reporteGeneral.registros_por_dia && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-purple-600" />
            Actividad de Registros Emocionales
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reporteGeneral.registros_por_dia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="fecha" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Registros" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de Psicólogos */}
      {reportePsicologos && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Actividad de Psicólogos
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Psicólogo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Pacientes</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Citas (Mes)</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Total Citas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Último Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportePsicologos.reporte.map((psicologo) => (
                  <tr key={psicologo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{psicologo.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{psicologo.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-semibold">
                        {psicologo.pacientes_activos}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-semibold">
                        {psicologo.citas_este_mes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-semibold">
                        {psicologo.citas_completadas_total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {psicologo.ultimo_acceso 
                        ? new Date(psicologo.ultimo_acceso).toLocaleDateString('es-ES')
                        : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesAdmin;