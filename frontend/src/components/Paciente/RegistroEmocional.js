import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Heart, Smile, Frown, Meh } from 'lucide-react';
import { apiCall } from '../../config/api';

const RegistroEmocional = ({ setCurrentView }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nivel_animo: 5,
    notas: '',
    contexto: '',
    ubicacion: '',
    clima: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiCall('/registros-emocionales', {
        method: 'POST',
        body: JSON.stringify({
          nivel_animo: parseInt(formData.nivel_animo),
          notas: formData.notas,
          contexto: formData.contexto || null,
          ubicacion: formData.ubicacion || null,
          clima: formData.clima || null
        })
      });
      
      setSuccess(true);
      setTimeout(() => {
        setCurrentView('dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (value) => {
    if (value >= 8) return 'from-green-400 to-green-600';
    if (value >= 6) return 'from-yellow-400 to-yellow-600';
    if (value >= 4) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  const getMoodIcon = (value) => {
    if (value >= 8) return <Smile className="w-12 h-12 text-white" />;
    if (value >= 5) return <Meh className="w-12 h-12 text-white" />;
    return <Frown className="w-12 h-12 text-white" />;
  };

  const getMoodText = (value) => {
    if (value >= 9) return '¡Excelente!';
    if (value >= 7) return 'Muy Bien';
    if (value >= 5) return 'Bien';
    if (value >= 3) return 'Regular';
    return 'Necesito Apoyo';
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">¡Registro Guardado!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por compartir cómo te sientes. Tu bienestar es importante para nosotros.
          </p>
          <div className="text-6xl mb-4">💚</div>
          <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <button
        onClick={() => setCurrentView('dashboard')}
        className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver al inicio
      </button>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 bg-gradient-to-br ${getMoodColor(formData.nivel_animo)} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {getMoodIcon(formData.nivel_animo)}
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">¿Cómo te Sientes Hoy?</h2>
          <p className="text-gray-600">Comparte tu estado emocional actual</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p className="font-semibold">Error al guardar</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Selector de Ánimo */}
          <div>
            <label className="block text-center mb-4">
              <span className="text-xl font-semibold text-gray-800">Tu nivel de ánimo</span>
              <div className="text-5xl font-bold mt-3 mb-2" style={{ 
                background: `linear-gradient(to right, ${formData.nivel_animo >= 8 ? '#10b981' : formData.nivel_animo >= 5 ? '#f59e0b' : '#ef4444'}, transparent)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {formData.nivel_animo}/10
              </div>
              <span className="text-lg font-medium text-gray-600">{getMoodText(formData.nivel_animo)}</span>
            </label>
            
            <div className="relative pt-6 pb-2">
              <input
                type="range"
                name="nivel_animo"
                min="1"
                max="10"
                value={formData.nivel_animo}
                onChange={handleChange}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    #ef4444 0%, 
                    #f59e0b 50%, 
                    #10b981 100%)`
                }}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>😢 Muy mal</span>
                <span>😐 Regular</span>
                <span>😊 Excelente</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué está pasando? (Opcional pero recomendado)
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none resize-none"
              placeholder="Comparte tus pensamientos, sentimientos o lo que sucedió hoy..."
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Escribir sobre tus emociones puede ayudarte a procesarlas mejor
            </p>
          </div>

          {/* Contexto Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contexto (Opcional)
              </label>
              <select
                name="contexto"
                value={formData.contexto}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                <option value="trabajo">Trabajo</option>
                <option value="familia">Familia</option>
                <option value="pareja">Pareja</option>
                <option value="amigos">Amigos</option>
                <option value="salud">Salud</option>
                <option value="financiero">Financiero</option>
                <option value="personal">Personal</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clima Actual (Opcional)
              </label>
              <select
                name="clima"
                value={formData.clima}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                <option value="soleado">☀️ Soleado</option>
                <option value="nublado">☁️ Nublado</option>
                <option value="lluvioso">🌧️ Lluvioso</option>
                <option value="tormentoso">⛈️ Tormentoso</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  <span>Guardar Registro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Mensaje de Apoyo */}
      {formData.nivel_animo < 4 && (
        <div className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💙</div>
            <div>
              <h4 className="font-semibold text-red-800 mb-2">Estamos aquí para ti</h4>
              <p className="text-red-700 text-sm leading-relaxed mb-3">
                Notamos que no te sientes bien. Recuerda que no estás solo. 
                Si necesitas hablar, nuestro chat de apoyo está disponible 24/7.
              </p>
              <button
                onClick={() => setCurrentView('chat')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
              >
                Ir al Chat de Apoyo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroEmocional;