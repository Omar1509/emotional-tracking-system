import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, Calendar, AlertTriangle, MessageCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiCall } from '../../config/api';

const DetallePaciente = ({ pacienteId, setCurrentView }) => {
  const [paciente, setPaciente] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registros');

  useEffect(() => {
    if (pacienteId) {
      loadPacienteData();
    }
  }, [pacienteId]);

  const loadPacienteData = async () => {
    try {
      // Cargar datos del paciente
      const pacienteData = await apiCall(`/pacientes/${pacienteId}`);
      setPaciente(pacienteData.paciente);

      // Cargar registros emocionales
      const registrosData = await apiCall(`/pacientes/${pacienteId}/registros-emocionales`);
      setRegistros(registrosData.registros || []);

      // Cargar historial de chat
      try {
        const chatData = await apiCall(`/pacientes/${pacienteId}/chat-history`);
        setChatHistory(chatData.mensajes || []);
      } catch (error) {
        console.log('No hay historial de chat disponible');
      }
    } catch (error) {
      console.error('Error cargando datos del paciente:', error);
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
        <p className="text-gray-600">No se pudo cargar la información del paciente</p>
        <button
          onClick={() => setCurrentView('pacientes')}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Volver a la lista
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
            onClick={() => setCurrentView('pacientes')}
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
            {paciente.nombre?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {paciente.nombre} {paciente.apellido}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{paciente.email}</span>
                  </div>
                  {paciente.telefono && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{paciente.telefono}</span>
                    </div>
                  )}
                  {paciente.fecha_nacimiento && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(paciente.fecha_nacimiento).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              {paciente.activo && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  Activo
                </span>
              )}
            </div>

            {paciente.direccion && (
              <p className="text-gray-600 text-sm mb-2">
                📍 {paciente.direccion}
              </p>
            )}

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Registrado: {new Date(paciente.fecha_registro).toLocaleDateString()}</span>
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
            <button
              onClick={() => setActiveTab('notas')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'notas'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📝 Notas Clínicas
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
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay conversaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {chatHistory.slice(0, 50).map(mensaje => (
                    <div
                      key={mensaje.id_mensaje}
                      className={`flex ${mensaje.es_bot ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          mensaje.es_bot
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        <p className="text-sm">{mensaje.mensaje}</p>
                        <p className={`text-xs mt-1 ${mensaje.es_bot ? 'text-gray-500' : 'text-blue-100'}`}>
                          {new Date(mensaje.fecha_hora).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Notas */}
          {activeTab === 'notas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Notas Clínicas</h4>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all">
                  ➕ Nueva Nota
                </button>
              </div>
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Funcionalidad de notas clínicas próximamente</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetallePaciente;