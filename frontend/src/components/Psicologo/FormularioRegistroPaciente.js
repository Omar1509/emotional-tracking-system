import React, { useState } from 'react';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { apiCall } from '../../config/api';

const FormularioRegistroPaciente = ({ setCurrentView }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    cedula: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    genero: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    contacto_emergencia_relacion: '',
    alergias: '',
    medicamentos_actuales: '',
    condiciones_medicas: '',
    motivo_consulta: ''
  });

  // Función para capitalizar (primera letra mayúscula, resto minúsculas)
  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Campos que deben ser capitalizados automáticamente
  const capitalizeFields = [
    'primer_nombre',
    'segundo_nombre', 
    'primer_apellido',
    'segundo_apellido',
    'contacto_emergencia_nombre',
    'contacto_emergencia_relacion'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si el campo debe ser capitalizado
    if (capitalizeFields.includes(name)) {
      setFormData({ 
        ...formData, 
        [name]: capitalizeText(value) 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiCall('/register/paciente', {
        method: 'POST',
        body: JSON.stringify(formData)
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Paciente Registrado Exitosamente!</h2>
            <p className="text-gray-600">{success.mensaje}</p>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-6 mb-6 border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-4 flex items-center">
              🔑 Credenciales Generadas
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Usuario</p>
                <p className="font-mono font-semibold text-gray-800 text-lg">{success.credenciales.username}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Email del sistema</p>
                <p className="font-mono font-semibold text-gray-800 text-lg">{success.credenciales.email}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Contraseña temporal</p>
                <p className="font-mono font-semibold text-gray-800 text-lg">{success.credenciales.password_temporal}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-semibold">Información importante:</p>
                <p className="text-sm text-blue-700 mt-1">
                  El paciente ha sido asignado automáticamente a ti. Comparte estas credenciales de forma segura.
                  El paciente debe cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Volver al Dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({
                  primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
                  cedula: '', telefono: '', direccion: '', fecha_nacimiento: '', genero: '',
                  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '', contacto_emergencia_relacion: '',
                  alergias: '', medicamentos_actuales: '', condiciones_medicas: '', motivo_consulta: ''
                });
              }}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Registrar Otro
            </button>
          </div>
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Registrar Nuevo Paciente</h2>
          <p className="text-gray-600">Completa el formulario de admisión</p>
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
              👤 Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input 
                  name="primer_nombre" 
                  value={formData.primer_nombre} 
                  onChange={handleChange}
                  placeholder="Primer Nombre *" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
              <div>
                <input 
                  name="segundo_nombre" 
                  value={formData.segundo_nombre} 
                  onChange={handleChange}
                  placeholder="Segundo Nombre"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
              <div>
                <input 
                  name="primer_apellido" 
                  value={formData.primer_apellido} 
                  onChange={handleChange}
                  placeholder="Primer Apellido *" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
              <div>
                <input 
                  name="segundo_apellido" 
                  value={formData.segundo_apellido} 
                  onChange={handleChange}
                  placeholder="Segundo Apellido"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
            </div>
            
            {/* Cédula de Identidad */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🪪 Cédula de Identidad *
              </label>
              <input 
                name="cedula" 
                value={formData.cedula} 
                onChange={handleChange}
                placeholder="0000000000 (10 dígitos)" 
                required
                pattern="[0-9]{10}"
                maxLength="10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
              <p className="text-xs text-gray-500 mt-1">📌 Debe tener exactamente 10 dígitos</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha de Nacimiento *
                </label>
                <input 
                  name="fecha_nacimiento" 
                  type="date" 
                  value={formData.fecha_nacimiento} 
                  onChange={handleChange} 
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
                <select 
                  name="genero" 
                  value={formData.genero} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              📞 Información de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                name="telefono" 
                value={formData.telefono} 
                onChange={handleChange}
                placeholder="Teléfono (ej: +593999999999) *" 
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
              <input 
                name="direccion" 
                value={formData.direccion} 
                onChange={handleChange}
                placeholder="Dirección *" 
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              🚨 Contacto de Emergencia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input 
                  name="contacto_emergencia_nombre" 
                  value={formData.contacto_emergencia_nombre} 
                  onChange={handleChange}
                  placeholder="Nombre Completo *" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
              <input 
                name="contacto_emergencia_telefono" 
                value={formData.contacto_emergencia_telefono} 
                onChange={handleChange}
                placeholder="Teléfono *" 
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
              <div>
                <input 
                  name="contacto_emergencia_relacion" 
                  value={formData.contacto_emergencia_relacion} 
                  onChange={handleChange}
                  placeholder="Relación *" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1">✨ Se capitalizará automáticamente</p>
              </div>
            </div>
          </div>

          {/* Información Médica */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              💊 Información Médica Relevante
            </h3>
            <div className="space-y-4">
              <textarea 
                name="alergias" 
                value={formData.alergias} 
                onChange={handleChange}
                placeholder="Alergias (opcional)" 
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
              <textarea 
                name="medicamentos_actuales" 
                value={formData.medicamentos_actuales} 
                onChange={handleChange}
                placeholder="Medicamentos Actuales (opcional)" 
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
              <textarea 
                name="condiciones_medicas" 
                value={formData.condiciones_medicas} 
                onChange={handleChange}
                placeholder="Condiciones Médicas (opcional)" 
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
            </div>
          </div>

          {/* Motivo de Consulta */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              📋 Motivo de Consulta
            </h3>
            <textarea 
              name="motivo_consulta" 
              value={formData.motivo_consulta} 
              onChange={handleChange}
              placeholder="Describe el motivo de consulta (mínimo 20 caracteres) *" 
              required 
              minLength={20} 
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.motivo_consulta.length}/20 caracteres mínimo
            </p>
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
              ) : 'Registrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioRegistroPaciente;