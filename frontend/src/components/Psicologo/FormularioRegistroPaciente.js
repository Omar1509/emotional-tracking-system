// frontend/src/components/Psicologo/FormularioRegistroPaciente.js
// ✅ VERSIÓN ULTRA-CORREGIDA CON TODAS LAS VALIDACIONES

import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, CreditCard, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import API_URL from '../../config/api';

const FormularioRegistroPaciente = ({ setCurrentView }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    cedula: '',
    correo: '',
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

  // ✅ VALIDAR DOMINIO DE CORREO
  const validarDominioCorreo = (email) => {
    const dominiosValidos = [
      'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
      'icloud.com', 'live.com', 'msn.com', 'protonmail.com',
      'unemi.edu.ec' // Dominio de tu universidad
    ];
    
    const regex = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;
    const match = email.match(regex);
    
    if (!match) return false;
    
    const dominio = match[1].toLowerCase();
    
    // Verificar si el dominio está en la lista o termina con un TLD válido
    const esValido = dominiosValidos.includes(dominio) || 
                     /\.(com|net|org|edu|ec|es|mx|ar|co|cl|pe|ve)$/i.test(dominio);
    
    return esValido;
  };

  // ✅ VALIDAR SOLO LETRAS Y ESPACIOS (para nombres)
  const validarSoloLetras = (texto) => {
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(texto);
  };

  // ✅ VALIDAR FECHA NO FUTURA
  const validarFechaNoFutura = (fecha) => {
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear hora para comparar solo fechas
    return fechaSeleccionada <= hoy;
  };

  // ✅ CALCULAR EDAD MÍNIMA (debe tener al menos 5 años)
  const validarEdadMinima = (fecha) => {
    const fechaNacimiento = new Date(fecha);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = fechaNacimiento.getMonth();
    
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fechaNacimiento.getDate())) {
      return edad - 1 >= 5;
    }
    
    return edad >= 5;
  };

  // ✅ FUNCIÓN PARA CAPITALIZAR AUTOMÁTICAMENTE
  const capitalizarTexto = (texto) => {
    return texto
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // ✅ VALIDACIÓN EN TIEMPO REAL PARA CÉDULA (solo números, máximo 10)
    if (name === 'cedula') {
      const soloNumeros = value.replace(/\D/g, ''); // Eliminar todo lo que no sea número
      if (soloNumeros.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: soloNumeros }));
      }
    }
    // ✅ VALIDACIÓN EN TIEMPO REAL PARA TELÉFONOS (solo números, máximo 10)
    else if (name === 'telefono' || name === 'contacto_emergencia_telefono') {
      const soloNumeros = value.replace(/\D/g, '');
      if (soloNumeros.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: soloNumeros }));
      }
    }
    // ✅ VALIDACIÓN EN TIEMPO REAL PARA NOMBRES (solo letras y capitalización automática)
    else if (['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'contacto_emergencia_nombre', 'contacto_emergencia_relacion'].includes(name)) {
      if (value === '' || validarSoloLetras(value)) {
        const valorCapitalizado = value === '' ? '' : capitalizarTexto(value);
        setFormData(prev => ({ ...prev, [name]: valorCapitalizado }));
      }
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // ✅ PRIMER NOMBRE (OBLIGATORIO)
    if (!formData.primer_nombre.trim()) {
      newErrors.primer_nombre = 'El primer nombre es obligatorio';
    } else if (!validarSoloLetras(formData.primer_nombre)) {
      newErrors.primer_nombre = 'El nombre solo puede contener letras';
    } else if (formData.primer_nombre.trim().length < 2) {
      newErrors.primer_nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // ✅ SEGUNDO NOMBRE (OPCIONAL, pero validar si existe)
    if (formData.segundo_nombre.trim() && !validarSoloLetras(formData.segundo_nombre)) {
      newErrors.segundo_nombre = 'El segundo nombre solo puede contener letras';
    }

    // ✅ PRIMER APELLIDO (OBLIGATORIO)
    if (!formData.primer_apellido.trim()) {
      newErrors.primer_apellido = 'El primer apellido es obligatorio';
    } else if (!validarSoloLetras(formData.primer_apellido)) {
      newErrors.primer_apellido = 'El apellido solo puede contener letras';
    } else if (formData.primer_apellido.trim().length < 2) {
      newErrors.primer_apellido = 'El apellido debe tener al menos 2 caracteres';
    }

    // ✅ SEGUNDO APELLIDO (OPCIONAL, pero validar si existe)
    if (formData.segundo_apellido.trim() && !validarSoloLetras(formData.segundo_apellido)) {
      newErrors.segundo_apellido = 'El segundo apellido solo puede contener letras';
    }

    // ✅ CÉDULA (EXACTAMENTE 10 DÍGITOS)
    if (!formData.cedula.trim()) {
      newErrors.cedula = 'La cédula es obligatoria';
    } else if (formData.cedula.length !== 10) {
      newErrors.cedula = 'La cédula debe tener exactamente 10 dígitos';
    } else if (!/^\d{10}$/.test(formData.cedula)) {
      newErrors.cedula = 'La cédula solo puede contener números';
    }

    // ✅ CORREO (CON VALIDACIÓN DE DOMINIO)
    if (!formData.correo.trim()) {
      newErrors.correo = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'El formato del correo no es válido';
    } else if (!validarDominioCorreo(formData.correo)) {
      newErrors.correo = 'El dominio del correo no es válido. Use dominios como gmail.com, hotmail.com, etc.';
    }

    // ✅ TELÉFONO (EXACTAMENTE 10 DÍGITOS)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    } else if (formData.telefono.length !== 10) {
      newErrors.telefono = 'El teléfono debe tener exactamente 10 dígitos';
    } else if (!/^\d{10}$/.test(formData.telefono)) {
      newErrors.telefono = 'El teléfono solo puede contener números';
    }

    // ✅ DIRECCIÓN
    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es obligatoria';
    } else if (formData.direccion.length < 10) {
      newErrors.direccion = 'La dirección debe tener al menos 10 caracteres';
    }

    // ✅ FECHA DE NACIMIENTO (NO FUTURA, EDAD MÍNIMA)
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria';
    } else if (!validarFechaNoFutura(formData.fecha_nacimiento)) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura';
    } else if (!validarEdadMinima(formData.fecha_nacimiento)) {
      newErrors.fecha_nacimiento = 'El paciente debe tener al menos 5 años';
    }

    // ✅ GÉNERO
    if (!formData.genero) {
      newErrors.genero = 'El género es obligatorio';
    }

    // ✅ CONTACTO DE EMERGENCIA
    if (!formData.contacto_emergencia_nombre.trim()) {
      newErrors.contacto_emergencia_nombre = 'El nombre del contacto de emergencia es obligatorio';
    } else if (formData.contacto_emergencia_nombre.length < 5) {
      newErrors.contacto_emergencia_nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    if (!formData.contacto_emergencia_telefono.trim()) {
      newErrors.contacto_emergencia_telefono = 'El teléfono de emergencia es obligatorio';
    } else if (formData.contacto_emergencia_telefono.length !== 10) {
      newErrors.contacto_emergencia_telefono = 'El teléfono debe tener exactamente 10 dígitos';
    }

    if (!formData.contacto_emergencia_relacion.trim()) {
      newErrors.contacto_emergencia_relacion = 'La relación es obligatoria';
    }

    // ✅ MOTIVO DE CONSULTA
    if (!formData.motivo_consulta.trim()) {
      newErrors.motivo_consulta = 'El motivo de consulta es obligatorio';
    } else if (formData.motivo_consulta.length < 20) {
      newErrors.motivo_consulta = 'El motivo de consulta debe tener al menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll al primer error
      const primerError = Object.keys(errors)[0];
      const elemento = document.getElementsByName(primerError)[0];
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elemento.focus();
      }
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

      {/* Alertas de validación global */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-red-800 font-semibold">Por favor corrige los siguientes errores:</h3>
          </div>
          <ul className="text-sm text-red-700 space-y-1 ml-7">
            {Object.values(errors).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

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
                maxLength={50}
              />
              {errors.primer_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.primer_nombre}</p>
              )}
            </div>

            {/* Segundo Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segundo Nombre <span className="text-gray-400">(Opcional)</span>
              </label>
              <input
                type="text"
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.segundo_nombre ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Carlos"
                maxLength={50}
              />
              {errors.segundo_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.segundo_nombre}</p>
              )}
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
                maxLength={50}
              />
              {errors.primer_apellido && (
                <p className="text-red-500 text-sm mt-1">{errors.primer_apellido}</p>
              )}
            </div>

            {/* Segundo Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segundo Apellido <span className="text-gray-400">(Opcional)</span>
              </label>
              <input
                type="text"
                name="segundo_apellido"
                value={formData.segundo_apellido}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.segundo_apellido ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="García"
                maxLength={50}
              />
              {errors.segundo_apellido && (
                <p className="text-red-500 text-sm mt-1">{errors.segundo_apellido}</p>
              )}
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
                  placeholder="0123456789"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Exactamente 10 dígitos</p>
              {errors.cedula && (
                <p className="text-red-500 text-sm mt-1">{errors.cedula}</p>
              )}
            </div>

            {/* Género */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Género <span className="text-red-500">*</span>
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.genero ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                <option value="prefiero_no_decir">Prefiero no decir</option>
              </select>
              {errors.genero && (
                <p className="text-red-500 text-sm mt-1">{errors.genero}</p>
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
                  max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">No se permiten fechas futuras</p>
              {errors.fecha_nacimiento && (
                <p className="text-red-500 text-sm mt-1">{errors.fecha_nacimiento}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Phone className="w-5 h-5 text-blue-600" />
            <span>Información de Contacto</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Correo */}
            <div>
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
                  placeholder="ejemplo@gmail.com"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Dominios válidos: gmail.com, hotmail.com, etc.</p>
              {errors.correo && (
                <p className="text-red-500 text-sm mt-1">{errors.correo}</p>
              )}
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
                  placeholder="0999999999"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Exactamente 10 dígitos (sin espacios ni guiones)</p>
              {errors.telefono && (
                <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
              )}
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
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
                placeholder="0999999999"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">10 dígitos</p>
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
              <p className="text-xs text-gray-500 mt-1">
                {formData.motivo_consulta.length}/20 caracteres mínimos
              </p>
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