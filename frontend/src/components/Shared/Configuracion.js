// frontend/src/components/Shared/Configuracion.js
// Configuración y cambio de contraseña para todos los roles

import React, { useState } from 'react';
import { Settings, Lock, User, Mail, Phone, MapPin, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../config/api';
import Notificacion from './Notificacion';

const Configuracion = ({ setCurrentView }) => {
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false);
  const [mostrarContrasenaNueva, setMostrarContrasenaNueva] = useState(false);
  const [mostrarContrasenaConfirmar, setMostrarContrasenaConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  const [formData, setFormData] = useState({
    contrasena_actual: '',
    contrasena_nueva: '',
    confirmar_contrasena: ''
  });

  const [errors, setErrors] = useState({});

  const nombreCompleto = localStorage.getItem('nombre_completo');
  const email = localStorage.getItem('email') || 'No disponible';
  const rol = localStorage.getItem('role') || 'Usuario';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.contrasena_actual.trim()) {
      newErrors.contrasena_actual = 'La contraseña actual es obligatoria';
    }

    if (!formData.contrasena_nueva.trim()) {
      newErrors.contrasena_nueva = 'La nueva contraseña es obligatoria';
    } else if (formData.contrasena_nueva.length < 8) {
      newErrors.contrasena_nueva = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!formData.confirmar_contrasena.trim()) {
      newErrors.confirmar_contrasena = 'Debes confirmar la nueva contraseña';
    } else if (formData.contrasena_nueva !== formData.confirmar_contrasena) {
      newErrors.confirmar_contrasena = 'Las contraseñas no coinciden';
    }

    if (formData.contrasena_actual === formData.contrasena_nueva) {
      newErrors.contrasena_nueva = 'La nueva contraseña debe ser diferente a la actual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      await api.put('/usuarios/cambiar-contrasena', {
        contrasena_actual: formData.contrasena_actual,
        contrasena_nueva: formData.contrasena_nueva
      });

      mostrarNotificacion('exito', '¡Contraseña actualizada!', 'Tu contraseña se ha cambiado exitosamente');
      
      // Limpiar formulario
      setFormData({
        contrasena_actual: '',
        contrasena_nueva: '',
        confirmar_contrasena: ''
      });

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      const mensaje = error.response?.data?.detail || 'No se pudo cambiar la contraseña. Verifica tu contraseña actual.';
      mostrarNotificacion('error', 'Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const getRoleBadgeColor = () => {
    switch(rol.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'psicologo':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'paciente':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Configuración</h1>
        <p className="text-gray-600">Administra tu cuenta y preferencias</p>
      </div>

      {/* Información del perfil */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <User className="w-6 h-6 mr-2 text-indigo-600" />
          Información del Perfil
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Nombre completo</p>
                <p className="font-semibold text-gray-800">{nombreCompleto}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Correo electrónico</p>
                <p className="font-semibold text-gray-800">{email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Rol en el sistema</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getRoleBadgeColor()}`}>
                  {rol.charAt(0).toUpperCase() + rol.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cambio de contraseña */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Lock className="w-6 h-6 mr-2 text-red-600" />
          Cambiar Contraseña
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña Actual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenaActual ? 'text' : 'password'}
                name="contrasena_actual"
                value={formData.contrasena_actual}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  errors.contrasena_actual ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingresa tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenaActual(!mostrarContrasenaActual)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasenaActual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.contrasena_actual && (
              <p className="text-red-500 text-sm mt-1">{errors.contrasena_actual}</p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenaNueva ? 'text' : 'password'}
                name="contrasena_nueva"
                value={formData.contrasena_nueva}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  errors.contrasena_nueva ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenaNueva(!mostrarContrasenaNueva)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasenaNueva ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.contrasena_nueva && (
              <p className="text-red-500 text-sm mt-1">{errors.contrasena_nueva}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenaConfirmar ? 'text' : 'password'}
                name="confirmar_contrasena"
                value={formData.confirmar_contrasena}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  errors.confirmar_contrasena ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenaConfirmar(!mostrarContrasenaConfirmar)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasenaConfirmar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmar_contrasena && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmar_contrasena}</p>
            )}
          </div>

          {/* Requisitos de contraseña */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <p className="font-semibold text-blue-900 mb-2">Requisitos de la contraseña:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Mínimo 8 caracteres</li>
              <li>• Debe ser diferente a tu contraseña actual</li>
              <li>• Se recomienda usar letras, números y símbolos</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex items-center space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
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

      {/* Advertencia de seguridad */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Seguridad de tu cuenta</p>
            <p className="text-sm text-yellow-700 mt-1">
              Al cambiar tu contraseña, se cerrará tu sesión en todos los dispositivos por seguridad.
              Tendrás que volver a iniciar sesión con tu nueva contraseña.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;