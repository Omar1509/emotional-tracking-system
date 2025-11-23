import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Bot, ArrowLeft, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import API_URL from '../../config/api';

const HistorialChat = ({ pacienteId, nombrePaciente, onClose }) => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    cargarHistorial();
  }, [pacienteId]);

  const cargarHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_URL}/psicologos/paciente/${pacienteId}/historial-chat?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error cargando historial');
      }

      const data = await response.json();
      setMensajes(data.mensajes || []);
      
      // Calcular estadísticas
      const totalMensajesUsuario = data.mensajes.filter(m => !m.es_bot).length;
      const totalMensajesBot = data.mensajes.filter(m => m.es_bot).length;
      const emocionesDetectadas = data.mensajes
        .filter(m => m.emocion_detectada)
        .map(m => m.emocion_detectada);
      
      const promedioSentimiento = data.mensajes
        .filter(m => m.sentimiento != null && !m.es_bot)
        .reduce((sum, m) => sum + m.sentimiento, 0) / totalMensajesUsuario || 0;

      setStats({
        total: data.total_mensajes,
        usuario: totalMensajesUsuario,
        bot: totalMensajesBot,
        promedioSentimiento: promedioSentimiento.toFixed(2),
        emociones: emocionesDetectadas
      });

    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmotionColor = (emocion) => {
    const colors = {
      'alegría': 'text-green-600 bg-green-100',
      'tristeza': 'text-blue-600 bg-blue-100',
      'enojo': 'text-red-600 bg-red-100',
      'miedo': 'text-purple-600 bg-purple-100',
      'ansiedad': 'text-orange-600 bg-orange-100',
      'neutral': 'text-gray-600 bg-gray-100'
    };
    return colors[emocion?.toLowerCase()] || 'text-gray-600 bg-gray-100';
  };

  const getSentimentEmoji = (sentimiento) => {
    if (sentimiento > 0.3) return '😊';
    if (sentimiento < -0.3) return '😢';
    return '😐';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <MessageCircle className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Historial de Chat</h2>
              <p className="text-purple-100">{nombrePaciente}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-sm">Total Mensajes</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-sm">Del Paciente</p>
            <p className="text-2xl font-bold">{stats.usuario}</p>
          </div>
          <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-sm">Del Bot</p>
            <p className="text-2xl font-bold">{stats.bot}</p>
          </div>
          <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-sm">Sentimiento</p>
            <p className="text-2xl font-bold flex items-center justify-center space-x-1">
              <span>{stats.promedioSentimiento}</span>
              {stats.promedioSentimiento > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {mensajes.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay mensajes en el historial</p>
          </div>
        ) : (
          mensajes.map((mensaje, index) => (
            <div
              key={mensaje.id || index}
              className={`flex ${mensaje.es_bot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[70%] ${mensaje.es_bot ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-2 ${mensaje.es_bot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    mensaje.es_bot ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {mensaje.es_bot ? (
                      <Bot className="w-5 h-5 text-purple-600" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`rounded-lg p-4 ${
                      mensaje.es_bot 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      <p className="text-sm leading-relaxed">{mensaje.mensaje}</p>
                      
                      {/* Análisis emocional del mensaje del usuario */}
                      {!mensaje.es_bot && mensaje.emocion_detectada && (
                        <div className="mt-3 pt-3 border-t border-blue-400 flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getEmotionColor(mensaje.emocion_detectada)} text-opacity-90`}>
                            {mensaje.emocion_detectada}
                          </span>
                          {mensaje.sentimiento != null && (
                            <span className="text-xs text-blue-100">
                              {getSentimentEmoji(mensaje.sentimiento)} {(mensaje.sentimiento * 10).toFixed(1)}/10
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${mensaje.es_bot ? '' : 'justify-end'}`}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {mensaje.fecha_hora ? new Date(mensaje.fecha_hora).toLocaleString('es-ES') : 'Fecha desconocida'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total de conversaciones: {stats.total}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistorialChat;