import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, BarChart3, TrendingUp, Heart, Calendar, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiCall } from '../../config/api';

const DashboardPaciente = ({ setCurrentView }) => {
  const [analytics, setAnalytics] = useState(null);
  const [registrosRecientes, setRegistrosRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const nombrePaciente = localStorage.getItem('nombre_completo');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const analyticsData = await apiCall('/registros-emocionales/analytics?dias=30');
      setAnalytics(analyticsData);

      const registrosData = await apiCall('/registros-emocionales?limit=7');
      setRegistrosRecientes(registrosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = registrosRecientes.map(r => ({
    fecha: new Date(r.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    animo: r.nivel_animo
  })).reverse();

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      'alegría': '😊',
      'tristeza': '😢',
      'ansiedad': '😰',
      'enojo': '😠',
      'miedo': '😨',
      'calma': '😌'
    };
    return emojis[emotion] || '😐';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">¡Hola, {nombrePaciente}!</h2>
        <p className="text-emerald-100 text-lg">¿Cómo te sientes hoy? Tu bienestar es importante.</p>
      </div>

      {/* Estadísticas Rápidas */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-gray-800">{analytics.promedio_animo}</span>
            </div>
            <p className="text-gray-600 text-sm">Promedio de Ánimo</p>
            <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-8 h-8 text-emerald-500" />
              <span className="text-3xl font-bold text-gray-800">{analytics.total_registros}</span>
            </div>
            <p className="text-gray-600 text-sm">Registros Totales</p>
            <p className="text-xs text-gray-500 mt-1">Este mes</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-gray-800 capitalize">{analytics.tendencia}</span>
            </div>
            <p className="text-gray-600 text-sm">Tendencia</p>
            <p className="text-xs text-gray-500 mt-1">Progreso</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-orange-500" />
              <span className="text-3xl font-bold text-gray-800">{registrosRecientes.length}</span>
            </div>
            <p className="text-gray-600 text-sm">Esta Semana</p>
            <p className="text-xs text-gray-500 mt-1">Registros</p>
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">¿Qué deseas hacer hoy?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('registrar')}
            className="flex flex-col items-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-xl transition-all border border-emerald-200 group"
          >
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Registrar Estado</h4>
            <p className="text-sm text-gray-600 text-center">Comparte cómo te sientes ahora</p>
          </button>

          <button
            onClick={() => setCurrentView('chat')}
            className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all border border-blue-200 group"
          >
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Chat de Apoyo</h4>
            <p className="text-sm text-gray-600 text-center">Habla con nuestro asistente</p>
          </button>
        </div>
      </div>

      {/* Gráfico de Evolución */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tu Evolución Esta Semana</h3>
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
                stroke="#10b981" 
                strokeWidth={3}
                name="Nivel de Ánimo"
                dot={{ fill: '#10b981', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Registros Recientes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Tus Últimos Registros</h3>
          <button
            onClick={() => setCurrentView('estadisticas')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : registrosRecientes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Aún no has registrado cómo te sientes</p>
            <button
              onClick={() => setCurrentView('registrar')}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
            >
              Hacer Mi Primer Registro
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {registrosRecientes.slice(0, 5).map(registro => (
              <div key={registro.id_registro} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">
                      {getEmotionEmoji(registro.emocion_principal)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-2xl font-bold text-emerald-600">{registro.nivel_animo}/10</span>
                        {registro.emocion_principal && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold capitalize">
                            {registro.emocion_principal}
                          </span>
                        )}
                      </div>
                      {registro.notas && (
                        <p className="text-sm text-gray-700">{registro.notas.substring(0, 100)}...</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(registro.fecha_hora).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mensaje Motivacional */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">💙</div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Recuerda</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              Cada día es una nueva oportunidad. Tu progreso, por pequeño que sea, es importante. 
              Estamos aquí para apoyarte en cada paso de tu camino hacia el bienestar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPaciente;