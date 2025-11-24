// frontend/src/components/Paciente/ChatApoyoRasa.js

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertCircle, CheckCircle } from 'lucide-react';

const ChatApoyoRasa = ({ setCurrentView }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  const RASA_URL = 'http://localhost:5006/webhooks/rest/webhook';
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = userData.id_usuario || userData.user_id || '1';

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkRasaConnection();
      addMessage('bot', '¡Hola! 👋 Soy tu asistente de apoyo emocional. Estoy aquí para escucharte. ¿Cómo te sientes hoy?');
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkRasaConnection = async () => {
    try {
      const response = await fetch('http://localhost:5006/', {
        method: 'GET'
      });
      
      if (response.ok) {
        setIsConnected(true);
        setConnectionError('');
      } else {
        throw new Error('Servidor no disponible');
      }
    } catch (error) {
      console.error('Error conectando con Rasa:', error);
      setIsConnected(false);
      setConnectionError('No se pudo conectar con el servidor. Asegúrate de que Rasa esté corriendo en el puerto 5006.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (role, content, emotion = null) => {
    const newMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      emotion,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => {
      const isDuplicate = prev.some(msg => 
        msg.content === content && 
        msg.role === role &&
        Date.now() - new Date(msg.timestamp).getTime() < 1000
      );
      
      if (isDuplicate) {
        console.log('⚠️ Mensaje duplicado detectado, ignorando:', content.substring(0, 50));
        return prev;
      }
      
      return [...prev, newMessage];
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessageText = inputMessage.trim();
    setInputMessage('');
    
    addMessage('user', userMessageText);
    setLoading(true);

    try {
      const response = await fetch(RASA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: `paciente_${userId}`,
          message: userMessageText
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('📥 Respuesta de Rasa:', data);

      if (data && data.length > 0) {
        const respuestasTexto = data
          .filter(r => r.text)
          .map(r => r.text);
        
        if (respuestasTexto.length > 0) {
          const respuestaCombinada = respuestasTexto.join('\n\n');
          addMessage('bot', respuestaCombinada);
        }
      } else {
        addMessage('bot', 'Disculpa, no pude procesar tu mensaje. ¿Puedes intentar reformularlo?');
      }
      
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      setIsConnected(false);
      addMessage('bot', '⚠️ Hubo un error al comunicarme con el servidor. Por favor, verifica que Rasa esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const retryConnection = () => {
    setConnectionError('');
    checkRasaConnection();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-6 rounded-t-xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Chat de Apoyo Emocional</h2>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    <p className="text-emerald-100 text-sm">Conectado</p>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                    <p className="text-red-100 text-sm">Desconectado</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Connection Error Alert */}
      {!isConnected && connectionError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                Problema de Conexión
              </h4>
              <p className="text-sm text-yellow-700 mb-3">
                {connectionError}
              </p>
              <button
                onClick={retryConnection}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-sm font-medium"
              >
                🔄 Reintentar Conexión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Inicia una conversación...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-6 h-6 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-white" />
                )}
              </div>

              <div
                className={`rounded-2xl px-5 py-3 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {message.emotion && message.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-600">
                      Emoción detectada: <strong>{message.emotion}</strong>
                    </span>
                  </div>
                )}

                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-emerald-100' : 'text-gray-400'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="bg-white rounded-2xl px-5 py-3 shadow-md border border-gray-200">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
        <div className="flex items-end space-x-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Escribe cómo te sientes... 💭" : "Conectando al servidor..."}
            disabled={loading || !isConnected}
            rows="2"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !inputMessage.trim() || !isConnected}
            className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            💡 Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
          {isConnected && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>Conectado a Rasa</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatApoyoRasa;