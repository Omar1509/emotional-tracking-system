// frontend/src/components/Psicologo/DetallePaciente.js
// REEMPLAZAR TODO

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, Calendar, AlertTriangle, MessageCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API_URL from '../../config/api';

const DetallePaciente = ({ pacienteId, setCurrentView }) => {
  const [paciente, setPaciente] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registros');

  useEffect(() => {
    if (pacienteId) {
      loadPacienteData();
    }
  }, [pacienteId]);

  const loadPacienteData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Cargando datos del paciente:', pacienteId);

      // Cargar datos del paciente desde la API de tus pacientes
      const response = await fetch(`${API_URL}/psicologos/mis-pacientes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando pacientes');
      }

      const data = await response.json();
      const pacienteEncontrado = data.pacientes.find(p => p.id_paciente === pacienteId);
      
      if (pacienteEncontrado) {
        setPaciente(pacienteEncontrado);
        console.log('✅ Paciente encontrado:', pacienteEncontrado);
      }

      // Cargar registros emocionales
      const registrosResponse = await fetch(`${API_URL}/pacientes/${pacienteId}/registros-emocionales`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (registrosResponse.ok) {
        const registrosData = await registrosResponse.json();
        setRegistros(registrosData.registros || []);
        console.log('✅ Registros cargados:', registrosData);
      }

    } catch (error) {
      console.error('❌ Error cargando datos del paciente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del paciente...</p>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No se pudo cargar la información del paciente</p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = registros.slice(-10).map(r => ({
    fecha: new Date(r.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    animo: r.nivel_animo,
    emocion: r.emocion_principal
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Perfil del Paciente</h2>
            <p className="text-gray-600 mt-1">Información detallada y seguimiento</p>
          </div>
        </div>
      </div>

      {/* Información del Paciente */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
            {paciente.nombre_completo?.charAt(0) || 'P'}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {paciente.nombre_completo}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {paciente.email && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{paciente.email}</span>
                    </div>
                  )}
                  {paciente.telefono && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{paciente.telefono}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                Activo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Registros esta semana</p>
                <p className="text-2xl font-bold text-blue-600">{paciente.registros_ultima_semana || 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Promedio ánimo 7 días</p>
                <p className="text-2xl font-bold text-green-600">{paciente.promedio_animo_7dias || 0}/10</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Alertas activas</p>
                <p className="text-2xl font-bold text-orange-600">{paciente.alertas_activas || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('registros')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'registros'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Registros Emocionales
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💬 Historial de Chat
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Registros Emocionales */}
          {activeTab === 'registros' && (
            <div className="space-y-6">
              {/* Gráfico */}
              {chartData.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Evolución del Estado de Ánimo</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="animo" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Nivel de Ánimo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Lista de Registros */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Últimos Registros ({registros.length})
                </h4>
                {registros.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No hay registros emocionales aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registros.slice(0, 10).map(registro => (
                      <div key={registro.id_registro} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-3xl font-bold text-blue-600">
                                {registro.nivel_animo}/10
                              </span>
                              {registro.emocion_principal && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold capitalize">
                                  {registro.emocion_principal}
                                </span>
                              )}
                              {registro.nivel_riesgo && registro.nivel_riesgo !== 'bajo' && (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Riesgo {registro.nivel_riesgo}</span>
                                </span>
                              )}
                            </div>
                            {registro.notas && (
                              <p className="text-gray-700 text-sm mb-2">{registro.notas}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(registro.fecha_hora).toLocaleString('es-ES')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Chat */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Historial de Conversaciones con el Bot
              </h4>
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Historial de chat próximamente disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetallePaciente;