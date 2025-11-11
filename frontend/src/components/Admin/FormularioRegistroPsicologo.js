import React, { useState } from 'react';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { apiCall } from '../../config/api';

const FormularioRegistroPsicologo = ({ setCurrentView }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    email_personal: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    numero_licencia: '',
    titulo_profesional: '',
    especialidad: '',
    años_experiencia: '',
    institucion_formacion: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        años_experiencia: parseInt(formData.años_experiencia)
      };

      const response = await apiCall('/register/psicologo', {
        method: 'POST',
        body: JSON.stringify(dataToSend)
      });
      
      setSuccess(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Psicólogo Registrado Exitosamente!</h2>
            <p className="text-gray-600">{success.mensaje}</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
              🔑 Credenciales Generadas
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Email de acceso</p>
                <p className="font-mono font-semibold text-gray-800 text-lg">{success.credenciales.email}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Contraseña temporal</p>
                <p className="font-mono font-semibold text-gray-800 text-lg">{success.credenciales.password_temporal}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-semibold">Importante:</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Comparte estas credenciales de forma segura con el psicólogo. 
                  Debe cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <button
        onClick={() => setCurrentView('dashboard')}
        className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver al dashboard
      </button>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Registrar Nuevo Psicólogo</h2>
          <p className="text-gray-600">Completa todos los campos para registrar un profesional</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p className="font-semibold">Error al registrar</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Datos Personales */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              📋 Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="primer_nombre"
                value={formData.primer_nombre}
                onChange={handleChange}
                placeholder="Primer Nombre *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleChange}
                placeholder="Segundo Nombre"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="primer_apellido"
                value={formData.primer_apellido}
                onChange={handleChange}
                placeholder="Primer Apellido *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="segundo_apellido"
                value={formData.segundo_apellido}
                onChange={handleChange}
                placeholder="Segundo Apellido"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Datos de Contacto */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              📞 Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="email_personal"
                type="email"
                value={formData.email_personal}
                onChange={handleChange}
                placeholder="Email Personal *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Teléfono (ej: +593999999999) *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
            </div>
            <input
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Dirección Completa *"
              required
              className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento *
              </label>
              <input
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Información Profesional */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              🎓 Información Profesional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="numero_licencia"
                value={formData.numero_licencia}
                onChange={handleChange}
                placeholder="Número de Licencia *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="titulo_profesional"
                value={formData.titulo_profesional}
                onChange={handleChange}
                placeholder="Título Profesional *"
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                placeholder="Especialidad"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
              <input
                name="años_experiencia"
                type="number"
                value={formData.años_experiencia}
                onChange={handleChange}
                placeholder="Años de Experiencia *"
                required
                min="0"
                max="50"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
              />
            </div>
            <input
              name="institucion_formacion"
              value={formData.institucion_formacion}
              onChange={handleChange}
              placeholder="Institución de Formación *"
              required
              className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
            />
          </div>

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
              className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Registrando...
                </span>
              ) : (
                'Registrar Psicólogo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioRegistroPsicologo;