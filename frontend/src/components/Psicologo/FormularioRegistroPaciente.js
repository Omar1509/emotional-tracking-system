import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, CreditCard, ArrowLeft, Check } from 'lucide-react';
import API_URL from '../../config/api';

const FormularioRegistroPaciente = ({ setCurrentView }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // ✅ DATOS CORREGIDOS - Coinciden con PacienteRegistro del backend
  const [formData, setFormData] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    cedula: '',
    correo: '',  // ✅ CAMBIO: "correo" no "email"
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

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.primer_nombre.trim()) {
      newErrors.primer_nombre = 'El primer nombre es obligatorio';
    }
    if (!formData.primer_apellido.trim()) {
      newErrors.primer_apellido = 'El primer apellido es obligatorio';
    }
    if (!formData.cedula.trim()) {
      newErrors.cedula = 'La cédula es obligatoria';
    } else if (formData.cedula.length < 10) {
      newErrors.cedula = 'La cédula debe tener al menos 10 caracteres';
    }
    if (!formData.correo.trim()) {
      newErrors.correo = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'El correo electrónico no es válido';
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    } else if (formData.telefono.length < 10) {
      newErrors.telefono = 'El teléfono debe tener al menos 10 dígitos';
    }
    if (!formData.direccion.trim() || formData.direccion.length < 10) {
      newErrors.direccion = 'La dirección debe tener al menos 10 caracteres';
    }
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria';
    }
    if (!formData.contacto_emergencia_nombre.trim() || formData.contacto_emergencia_nombre.length < 5) {
      newErrors.contacto_emergencia_nombre = 'El nombre del contacto de emergencia debe tener al menos 5 caracteres';
    }
    if (!formData.contacto_emergencia_telefono.trim()) {
      newErrors.contacto_emergencia_telefono = 'El teléfono de emergencia es obligatorio';
    }
    if (!formData.contacto_emergencia_relacion.trim()) {
      newErrors.contacto_emergencia_relacion = 'La relación es obligatoria';
    }
    if (!formData.motivo_consulta.trim() || formData.motivo_consulta.length < 20) {
      newErrors.motivo_consulta = 'El motivo de consulta debe tener al menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/psicologos/registrar-paciente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al registrar paciente');
      }

      console.log('✅ Paciente registrado:', data);
      setSuccess(true);
      
      setTimeout(() => {
        setCurrentView('dashboard');
      }, 3000);

    } catch (error) {
      console.error('❌ Error:', error);
      alert(error.message || 'Error al registrar paciente');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Paciente Registrado!
          </h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              <strong>✅ Las credenciales han sido enviadas por correo</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              El paciente recibirá un correo con:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Usuario: {formData.correo}</li>
              <li>• Contraseña temporal (generada automáticamente)</li>
              <li>• Instrucciones para el primer acceso</li>
            </ul>
          </div>
          <p className="text-gray-600 text-sm">
            Redirigiendo al dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al Dashboard</span>
        </button>
        <h2 className="text-3xl font-bold text-gray-800">Registrar Nuevo Paciente</h2>
        <p className="text-gray-600 mt-2">Complete toda la información del paciente. Se enviarán las credenciales por correo.</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 space-y-6">
        
        {/* Información Personal */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Información Personal</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primer Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primer Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="primer_nombre"
                value={formData.primer_nombre}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.primer_nombre ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Juan"
              />
              {errors.primer_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.primer_nombre}</p>
              )}
            </div>

            {/* Segundo Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segundo Nombre
              </label>
              <input
                type="text"
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Carlos (opcional)"
              />
            </div>

            {/* Primer Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primer Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="primer_apellido"
                value={formData.primer_apellido}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.primer_apellido ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Pérez"
              />
              {errors.primer_apellido && (
                <p className="text-red-500 text-sm mt-1">{errors.primer_apellido}</p>
              )}
            </div>

            {/* Segundo Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segundo Apellido
              </label>
              <input
                type="text"
                name="segundo_apellido"
                value={formData.segundo_apellido}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="González (opcional)"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.cedula ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                  maxLength="20"
                />
              </div>
              {errors.cedula && (
                <p className="text-red-500 text-sm mt-1">{errors.cedula}</p>
              )}
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.fecha_nacimiento && (
                <p className="text-red-500 text-sm mt-1">{errors.fecha_nacimiento}</p>
              )}
            </div>

            {/* Género */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Género
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

        {/* Información de Contacto */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Información de Contacto</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Correo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.correo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              {errors.correo && (
                <p className="text-red-500 text-sm mt-1">{errors.correo}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                ✉️ Se enviarán las credenciales de acceso a este correo
              </p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.telefono ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+593 999 999 999"
                />
              </div>
              {errors.telefono && (
                <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
              )}
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.direccion ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Calle principal, ciudad"
                />
              </div>
              {errors.direccion && (
                <p className="text-red-500 text-sm mt-1">{errors.direccion}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contacto de Emergencia */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Contacto de Emergencia
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contacto_emergencia_nombre"
                value={formData.contacto_emergencia_nombre}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.contacto_emergencia_nombre ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="María González"
              />
              {errors.contacto_emergencia_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.contacto_emergencia_nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contacto_emergencia_telefono"
                value={formData.contacto_emergencia_telefono}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.contacto_emergencia_telefono ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+593 999 999 999"
              />
              {errors.contacto_emergencia_telefono && (
                <p className="text-red-500 text-sm mt-1">{errors.contacto_emergencia_telefono}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relación <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contacto_emergencia_relacion"
                value={formData.contacto_emergencia_relacion}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.contacto_emergencia_relacion ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Madre, Esposo, etc."
              />
              {errors.contacto_emergencia_relacion && (
                <p className="text-red-500 text-sm mt-1">{errors.contacto_emergencia_relacion}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información Médica */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Información Médica
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alergias
              </label>
              <textarea
                name="alergias"
                value={formData.alergias}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ninguna o especificar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicamentos Actuales
              </label>
              <textarea
                name="medicamentos_actuales"
                value={formData.medicamentos_actuales}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ninguno o especificar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condiciones Médicas
              </label>
              <textarea
                name="condiciones_medicas"
                value={formData.condiciones_medicas}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ninguna o especificar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de Consulta <span className="text-red-500">*</span>
              </label>
              <textarea
                name="motivo_consulta"
                value={formData.motivo_consulta}
                onChange={handleChange}
                rows="4"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.motivo_consulta ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe el motivo de la consulta (mínimo 20 caracteres)..."
              />
              {errors.motivo_consulta && (
                <p className="text-red-500 text-sm mt-1">{errors.motivo_consulta}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información Importante */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📧 Envío Automático de Credenciales</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Se generará una contraseña temporal automáticamente</li>
            <li>✅ Las credenciales se enviarán al correo del paciente</li>
            <li>✅ El paciente deberá cambiar la contraseña en su primer inicio de sesión</li>
            <li>✅ No se mostrará la contraseña temporal por seguridad</li>
          </ul>
        </div>

        {/* Botones */}
        <div className="flex items-center space-x-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Paciente y Enviar Credenciales'}
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioRegistroPaciente;