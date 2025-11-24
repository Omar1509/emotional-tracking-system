// frontend/src/components/Paciente/ChatApoyoRasa.js
// ✅ VERSIÓN ULTRA-MEJORADA - Con debugging detallado y mejor manejo de errores

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageCircle, ArrowLeft } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const ChatApoyoRasa = ({ setCurrentView }) => {
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [notificacion, setNotificacion] = useState(null);
  const [chatHabilitado, setChatHabilitado] = useState(true);
  const mensajesEndRef = useRef(null);

  useEffect(() => {
    console.log('🚀 ChatApoyoRasa montado');
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
      console.log('📡 Cargando historial de chat...');
      const response = await api.get('/chat/historial?limite=50');
      
      if (response.mensajes && Array.isArray(response.mensajes)) {
        console.log('✅ Historial cargado:', response.mensajes.length, 'mensajes');
        const mensajesOrdenados = response.mensajes.reverse();
        setMensajes(mensajesOrdenados);
      } else {
        console.log('ℹ️ No hay historial previo');
      }
      setChatHabilitado(true);
    } catch (error) {
      console.warn('⚠️ Error cargando historial (no crítico):', error);
      setChatHabilitado(true); // Habilitar el chat aunque no haya historial
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    
    console.log('📤 Intentando enviar mensaje...');
    
    if (!mensaje.trim()) {
      mostrarNotificacion('advertencia', 'Mensaje vacío', 'Por favor escribe un mensaje');
      return;
    }

    const textoMensaje = mensaje.trim();
    console.log('📝 Mensaje a enviar:', textoMensaje);

    const mensajeUsuario = {
      mensaje: textoMensaje,
      es_bot: false,
      fecha_hora: new Date().toISOString(),
      emocion: null
    };

    // Agregar mensaje del usuario inmediatamente
    setMensajes(prev => [...prev, mensajeUsuario]);
    setMensaje('');
    setLoading(true);
    setEscribiendo(true);

    try {
      console.log('📡 Enviando al backend...');
      
      const response = await api.post('/chat', {
        mensaje: textoMensaje
      });

      console.log('✅ Respuesta recibida del backend:', response);
      setEscribiendo(false);

      // Verificar si hay respuestas
      if (response.respuestas && Array.isArray(response.respuestas) && response.respuestas.length > 0) {
        console.log('💬 Procesando', response.respuestas.length, 'respuesta(s)');
        
        const nuevosMessages = response.respuestas.map(respuesta => ({
          mensaje: respuesta,
          es_bot: true,
          fecha_hora: new Date().toISOString(),
          emocion: response.analisis_emocional?.emocion_dominante
        }));

        setMensajes(prev => [...prev, ...nuevosMessages]);

        // Mostrar alerta si hay alto riesgo
        if (response.requiere_atencion) {
          console.log('⚠️ Alto riesgo detectado - Notificando al psicólogo');
          mostrarNotificacion(
            'advertencia',
            'Atención',
            'Hemos notificado a tu psicólogo sobre tu estado emocional'
          );
        }

        // Log del análisis emocional
        if (response.analisis_emocional) {
          console.log('🧠 Análisis emocional:', {
            emocion: response.analisis_emocional.emocion_dominante,
            sentimiento: response.analisis_emocional.sentimiento,
            score: response.analisis_emocional.sentimiento_score
          });
        }
      } else {
        console.warn('⚠️ No se recibieron respuestas del backend');
        
        // Mensaje de fallback
        const errorMsg = {
          mensaje: 'Lo siento, no pude generar una respuesta en este momento. ¿Podrías reformular tu mensaje?',
          es_bot: true,
          fecha_hora: new Date().toISOString()
        };
        setMensajes(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setEscribiendo(false);
      
      // Mensaje de error más amigable
      let mensajeError = 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
      
      if (error.response?.status === 500) {
        mensajeError = 'Hubo un problema con el servidor. Por favor intenta nuevamente en unos momentos.';
      } else if (error.response?.status === 401) {
        mensajeError = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      } else if (!navigator.onLine) {
        mensajeError = 'No hay conexión a internet. Por favor verifica tu conexión.';
      }
      
      const errorMsg = {
        mensaje: mensajeError,
        es_bot: true,
        fecha_hora: new Date().toISOString()
      };
      setMensajes(prev => [...prev, errorMsg]);
      
      mostrarNotificacion('error', 'Error de conexión', 'No se pudo enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const limpiarHistorial = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('🗑️ Limpiando historial...');
      await api.delete('/chat/historial');
      setMensajes([]);
      console.log('✅ Historial limpiado correctamente');
      mostrarNotificacion('exito', 'Historial limpio', 'Se eliminó el historial de conversación');
    } catch (error) {
      console.error('❌ Error limpiando historial:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo limpiar el historial');
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const obtenerEmojiEmocion = (emocion) => {
    if (!emocion) return null;
    
    const emojis = {
      'tristeza': '😢',
      'alegria': '😊',
      'alegría': '😊',
      'enojo': '😠',
      'miedo': '😰',
      'sorpresa': '😲',
      'ansiedad': '😰',
      'neutral': '😐',
      'disgusto': '😖',
      'joy': '😊',
      'sadness': '😢',
      'anger': '😠',
      'fear': '😰',
      'surprise': '😲',
      'disgust': '😖'
    };
    
    return emojis[emocion.toLowerCase()] || null;
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Chat de Apoyo Emocional</h1>
                <p className="text-sm text-gray-600">
                  Asistente terapéutico con IA {!chatHabilitado && '(Conectando...)'}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={limpiarHistorial}
            disabled={mensajes.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span className="font-semibold">Limpiar</span>
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {mensajes.length === 0 ? (
            <div className="text-center text-white py-12">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <h3 className="text-2xl font-bold mb-2">¡Hola! 👋</h3>
              <p className="text-lg opacity-90 mb-4">
                Soy tu asistente de apoyo emocional. Estoy aquí para escucharte.
              </p>
              <p className="text-sm opacity-75">
                Puedes compartir cómo te sientes, lo que te preocupa o simplemente conversar.
              </p>
            </div>
          ) : (
            mensajes.map((msg, index) => (
              <div
                key={`msg-${index}-${msg.fecha_hora}`}
                className={`flex ${msg.es_bot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xl rounded-2xl px-6 py-4 shadow-lg ${
                    msg.es_bot
                      ? 'bg-white text-gray-800'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {msg.es_bot && (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {msg.mensaje}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${msg.es_bot ? 'text-gray-500' : 'text-indigo-100'}`}>
                          {new Date(msg.fecha_hora).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {!msg.es_bot && msg.emocion && (
                          <span className="text-xl ml-2" title={msg.emocion}>
                            {obtenerEmojiEmocion(msg.emocion)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {escribiendo && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={mensajesEndRef} />
        </div>
      </div>

      {/* Input de mensaje */}
      <div className="bg-white border-t shadow-lg p-4">
        <form onSubmit={enviarMensaje} className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={loading ? "Enviando..." : "Escribe tu mensaje aquí..."}
              disabled={loading || !chatHabilitado}
              className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-full focus:outline-none focus:border-indigo-500 text-gray-800 placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="submit"
              disabled={loading || !mensaje.trim() || !chatHabilitado}
              className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center"
              title={!chatHabilitado ? "Conectando con el servidor..." : "Enviar mensaje"}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          {!chatHabilitado && (
            <p className="text-center text-red-600 text-sm mt-2">
              Conectando con el servidor... Si el problema persiste, recarga la página.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatApoyoRasa;