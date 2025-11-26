// frontend/src/components/Admin/DetallePsicologo.js
// ✅ Vista detallada de un psicólogo para el administrador

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Briefcase, Award, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { apiCall } from '../../config/api';

const DetallePsicologo = ({ psicologoId, setCurrentView }) => {
  const [psicologo, setPsicologo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDetallePsicologo();
  }, [psicologoId]);

  const cargarDetallePsicologo = async () => {
    try {
      setLoading(true);
      const data = await apiCall(`/admin/psicologos/${psicologoId}`);
      setPsicologo(data);
    } catch (err) {
      console.error('Error cargando psicólogo:', err);
      setError('No se pudo cargar la información del psicólogo');
    } finally {
      setLoading(false);
    }
  };

  const toggleEstado = async () => {
    try {
      await apiCall(`/admin/psicologos/${psicologoId}/toggle-estado`, {
        method: 'PUT'
      });
      
      // Recargar datos
      await cargarDetallePsicologo();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError('No se pudo cambiar el estado del psicólogo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !psicologo) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setCurrentView('psicologos')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700">{error || 'Psicólogo no encontrado'}</p>
        </div>
      </div>
    );
  }

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentView('psicologos')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a psicólogos
        </button>
      </div>

      {/* Card principal del psicólogo */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
              {psicologo.nombre?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {psicologo.nombre_completo}
              </h1>
              <p className="text-lg text-gray-600 mb-3">
                {psicologo.especialidad || 'Psicología General'}
              </p>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  psicologo.activo 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {psicologo.activo ? '✓ Activo' : '○ Inactivo'}
                </span>
                <span className="text-sm text-gray-500">
                  Registro: {new Date(psicologo.fecha_registro).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={toggleEstado}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              psicologo.activo
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
            }`}
          >
            {psicologo.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>

        {/* Grid de información */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          {/* Columna izquierda - Info personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Información Personal
            </h3>
            
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.email}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.telefono || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Dirección</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.direccion || 'No registrada'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Edad</p>
                <p className="text-sm text-gray-800 font-medium">
                  {calcularEdad(psicologo.fecha_nacimiento)} años
                </p>
              </div>
            </div>
          </div>

          {/* Columna derecha - Info profesional */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
              Información Profesional
            </h3>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Award className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Licencia Profesional</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.numero_licencia || 'No registrada'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Título Profesional</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.titulo_profesional || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Experiencia</p>
                <p className="text-sm text-gray-800 font-medium">
                  {psicologo.años_experiencia || 0} años
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Award className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Institución de Formación</p>
                <p className="text-sm text-gray-800 font-medium">{psicologo.institucion_formacion || 'No registrada'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas del psicólogo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Pacientes Asignados</p>
              <p className="text-4xl font-bold mt-2">{psicologo.total_pacientes || 0}</p>
              <p className="text-blue-100 text-xs mt-2">Activos actualmente</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Citas Completadas</p>
              <p className="text-4xl font-bold mt-2">{psicologo.citas_completadas || 0}</p>
              <p className="text-purple-100 text-xs mt-2">Sesiones realizadas</p>
            </div>
            <Calendar className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Último Acceso</p>
              <p className="text-lg font-bold mt-2">
                {psicologo.ultimo_acceso 
                  ? new Date(psicologo.ultimo_acceso).toLocaleDateString()
                  : 'Nunca'}
              </p>
              <p className="text-emerald-100 text-xs mt-2">
                {psicologo.ultimo_acceso 
                  ? new Date(psicologo.ultimo_acceso).toLocaleTimeString()
                  : '—'}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* Nota de privacidad */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">Nota sobre Privacidad</h4>
            <p className="text-yellow-700 text-sm leading-relaxed">
              Como administrador, puedes ver la información profesional y de contacto del psicólogo, 
              pero <strong>no tienes acceso a los datos sensibles de sus pacientes</strong> (registros emocionales, 
              notas de sesiones, contenido de conversaciones). Solo el psicólogo asignado puede acceder 
              a esta información confidencial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetallePsicologo;