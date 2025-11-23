// frontend/src/components/Paciente/ChatApoyoRasa.js
// ✅ VERSIÓN OPTIMIZADA - USA API CENTRALIZADA

import React, { useState, useEffect, useRef } from 'react';
import { api, getCurrentUser } from '../../config/api';  // ✅ Importar API centralizada
import Notificacion from '../Shared/Notificacion';

const ChatApoyoRasa = () => {
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificacion, setNotificacion] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const mensajesEndRef = useRef(null);

  useEffect(() => {
    const usuarioData = getCurrentUser();  // ✅ Usar función centralizada
    setUsuario(usuarioData);
    cargarHistorial();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const scrollToBottom = () => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cargarHistorial = async () => {
    try {
      const response = await api.get('/historial');  // ✅ API centralizada
      
      if (response.historial && response.historial.length > 0) {
        const historialFormateado = response.historial.map(msg => ({
          texto: msg.mensaje,
          esBot: msg.es_bot,
          timestamp: msg.timestamp,
          emocion: msg.emocion_detectada
        }));
        setMensajes(historialFormateado);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      // No mostrar error si no hay historial
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    
    if (!mensaje.trim()) return;

    try {
      const nuevoMensaje = {
        texto: mensaje,
        esBot: false,
        timestamp: new Date().toISOString()
      };
      
      setMensajes(prev => [...prev, nuevoMensaje]);
      setMensaje('');
      setLoading(true);

      // ✅ Usar API centralizada
      const response = await api.post('/chat', {
        mensaje: mensaje
      });

      const respuestaBot = {
        texto: response.respuesta,
        esBot: true,
        timestamp: response.timestamp,
        emocion: response.emocion_detectada
      };
      
      setMensajes(prev => [...prev, respuestaBot]);
      setLoading(false);
      
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setLoading(false);
      
      const mensajeError = {
        texto: 'Lo siento, el servicio de chatbot no está disponible en este momento. Por favor, intenta más tarde.',
        esBot: true,
        timestamp: new Date().toISOString()
      };
      setMensajes(prev => [...prev, mensajeError]);
      
      mostrarNotificacion('error', 'Error', 'No se pudo conectar con el chatbot');
    }
  };

  const limpiarHistorial = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar todo el historial de conversación?')) {
      return;
    }

    try {
      // ✅ Usar API centralizada
      await api.delete('/historial');
      
      setMensajes([]);
      mostrarNotificacion('exito', 'Historial Eliminado', 'Tu historial de conversación ha sido eliminado');
    } catch (error) {
      console.error('Error limpiando historial:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo eliminar el historial');
    }
  };

  const obtenerEmojiEmocion = (emocion) => {
    const emociones = {
      'tristeza': '😢',
      'alegria': '😊',
      'alegría': '😊',
      'amor': '❤️',
      'enojo': '😠',
      'miedo': '😰',
      'sorpresa': '😲',
      'ansiedad': '😰',
      'neutral': '😐'
    };
    return emociones[emocion?.toLowerCase()] || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 flex items-center justify-center">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      <div className="w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">💬 Chatbot de Apoyo Emocional</h2>
              <p className="text-indigo-100">Habla libremente, estoy aquí para escucharte</p>
            </div>
            {mensajes.length > 0 && (
              <button
                onClick={limpiarHistorial}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 border-2 border-white rounded-lg font-semibold transition-all"
              >
                🗑️ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {mensajes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🤖</div>
              <h3 className="text-2xl font-bold text-indigo-600 mb-4">
                ¡Hola, {usuario?.nombre_completo || 'amigo'}!
              </h3>
              <p className="text-gray-700 text-lg mb-2">Soy tu asistente de apoyo emocional.</p>
              <p className="text-gray-600 mb-6">
                Puedes contarme cómo te sientes, y yo estaré aquí para escucharte y apoyarte.
              </p>
              <div className="bg-white rounded-xl p-6 max-w-md mx-auto shadow-md">
                <p className="font-semibold text-indigo-600 mb-3">Puedes decirme cosas como:</p>
                <ul className="text-left space-y-2">
                  {['Me siento triste hoy', 'Estoy muy feliz', 'Tengo ansiedad', 'Necesito hablar'].map((texto, i) => (
                    <li key={i} className="flex items-center space-x-2 text-gray-700">
                      <span className="text-xl">💭</span>
                      <span>"{texto}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mensajes.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 animate-fadeIn ${msg.esBot ? 'justify-start' : 'justify-end'}`}
                >
                  {msg.esBot && (
                    <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-2xl flex-shrink-0">
                      🤖
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${!msg.esBot ? 'order-1' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl shadow-md ${
                        msg.esBot
                          ? 'bg-white text-gray-800 rounded-tl-none'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-tr-none'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.texto}</p>
                      {msg.emocion && obtenerEmojiEmocion(msg.emocion) && (
                        <span
                          className="inline-block ml-2 text-xl"
                          title={`Emoción detectada: ${msg.emocion}`}
                        >
                          {obtenerEmojiEmocion(msg.emocion)}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 px-2 ${!msg.esBot ? 'text-right' : ''}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {!msg.esBot && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 shadow-md flex items-center justify-center text-2xl flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-md">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={mensajesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={enviarMensaje} className="p-6 bg-white border-t-2 border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              disabled={loading}
              className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !mensaje.trim()}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-2xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 shadow-lg flex items-center justify-center"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatApoyoRasa;