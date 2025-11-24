// frontend/src/components/Psicologo/DetallePaciente.js
// ✅ VERSIÓN ULTRA-CORREGIDA - Manejo robusto de errores y carga de datos

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, TrendingUp, Activity, Plus, Target, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const DetallePaciente = ({ pacienteId, setCurrentView }) => {
  const [paciente, setPaciente] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [ejerciciosAsignados, setEjerciciosAsignados] = useState([]);
  const [catalogoEjercicios, setCatalogoEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [tabActiva, setTabActiva] = useState('registros'); // registros, ejercicios
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);

  const [formAsignacion, setFormAsignacion] = useState({
    id_ejercicio: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    veces_requeridas: 7,
    frecuencia: 'diaria',
    notas_psicologo: ''
  });

  useEffect(() => {
    if (pacienteId) {
      console.log('🔍 Cargando datos para paciente ID:', pacienteId);
      cargarDatosPaciente();
    } else {
      console.error('❌ No se especificó pacienteId');
      mostrarNotificacion('error', 'Error', 'No se especificó un paciente');
      setCurrentView('pacientes');
    }
  }, [pacienteId]);

  const cargarDatosPaciente = async () => {
    try {
      setLoading(true);
      console.log('📡 Iniciando carga de datos del paciente...');

      // ✅ PASO 1: Cargar datos del paciente
      try {
        console.log('📡 Cargando lista de pacientes...');
        const pacientesResponse = await api.get('/psicologos/mis-pacientes');
        console.log('✅ Pacientes cargados:', pacientesResponse.pacientes?.length || 0);
        
        const pacienteEncontrado = pacientesResponse.pacientes.find(
          p => p.id_usuario === pacienteId
        );

        if (!pacienteEncontrado) {
          console.error('❌ Paciente no encontrado en la lista');
          mostrarNotificacion('error', 'Error', 'Paciente no encontrado');
          setCurrentView('pacientes');
          return;
        }

        console.log('✅ Paciente encontrado:', pacienteEncontrado.nombre);
        setPaciente(pacienteEncontrado);
      } catch (error) {
        console.error('❌ Error cargando paciente:', error);
        mostrarNotificacion('error', 'Error', 'No se pudo cargar la información del paciente');
        setCurrentView('pacientes');
        return;
      }

      // ✅ PASO 2: Cargar registros emocionales
      try {
        console.log('📡 Cargando registros emocionales...');
        const registrosResponse = await api.get(`/pacientes/${pacienteId}/registros-emocionales`);
        const registrosData = registrosResponse.registros || [];
        console.log('✅ Registros cargados:', registrosData.length);
        
        const registrosOrdenados = registrosData.sort(
          (a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)
        );
        setRegistros(registrosOrdenados);
      } catch (error) {
        console.warn('⚠️ Error cargando registros (no crítico):', error);
        setRegistros([]);
      }

      // ✅ PASO 3: Cargar ejercicios asignados
      try {
        console.log('📡 Cargando ejercicios asignados...');
        const ejerciciosResponse = await api.get(`/ejercicios/paciente/${pacienteId}/asignados`);
        const ejerciciosData = ejerciciosResponse.ejercicios_asignados || [];
        console.log('✅ Ejercicios asignados cargados:', ejerciciosData.length);
        setEjerciciosAsignados(ejerciciosData);
      } catch (error) {
        console.warn('⚠️ Error cargando ejercicios asignados (no crítico):', error);
        setEjerciciosAsignados([]);
      }

      // ✅ PASO 4: Cargar catálogo de ejercicios
      try {
        console.log('📡 Cargando catálogo de ejercicios...');
        const catalogoResponse = await api.get('/ejercicios/catalogo');
        const catalogoData = catalogoResponse.ejercicios || [];
        console.log('✅ Catálogo de ejercicios cargado:', catalogoData.length);
        setCatalogoEjercicios(catalogoData);
      } catch (error) {
        console.warn('⚠️ Error cargando catálogo (no crítico):', error);
        setCatalogoEjercicios([]);
      }

      console.log('✅ ¡Todos los datos cargados exitosamente!');

    } catch (error) {
      console.error('❌ Error general cargando datos del paciente:', error);
      mostrarNotificacion('error', 'Error', 'No se pudieron cargar los datos del paciente');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const abrirModalAsignar = () => {
    // Establecer fecha_fin por defecto a 7 días después
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + 7);
    setFormAsignacion({
      ...formAsignacion,
      fecha_fin: fechaFin.toISOString().split('T')[0]
    });
    setMostrarModalAsignar(true);
  };

  const asignarEjercicio = async (e) => {
    e.preventDefault();

    if (!formAsignacion.id_ejercicio) {
      mostrarNotificacion('advertencia', 'Atención', 'Debes seleccionar un ejercicio');
      return;
    }

    try {
      console.log('📡 Asignando ejercicio...', formAsignacion);
      
      await api.post('/ejercicios/asignar', {
        id_ejercicio: parseInt(formAsignacion.id_ejercicio),
        id_paciente: pacienteId,
        fecha_inicio: formAsignacion.fecha_inicio,
        fecha_fin: formAsignacion.fecha_fin,
        veces_requeridas: parseInt(formAsignacion.veces_requeridas),
        frecuencia: formAsignacion.frecuencia,
        notas_psicologo: formAsignacion.notas_psicologo
      });

      console.log('✅ Ejercicio asignado correctamente');
      mostrarNotificacion('exito', 'Ejercicio asignado', 'El ejercicio se asignó correctamente al paciente');
      setMostrarModalAsignar(false);
      setFormAsignacion({
        id_ejercicio: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        veces_requeridas: 7,
        frecuencia: 'diaria',
        notas_psicologo: ''
      });
      cargarDatosPaciente(); // Recargar datos
    } catch (error) {
      console.error('❌ Error asignando ejercicio:', error);
      mostrarNotificacion('error', 'Error', error.message || 'No se pudo asignar el ejercicio');
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerColorAnimo = (nivel) => {
    if (nivel <= 3) return 'bg-red-500';
    if (nivel <= 5) return 'bg-orange-500';
    if (nivel <= 7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const prepararDatosGrafico = () => {
    const ultimosRegistros = registros.slice(0, 10).reverse();
    
    return ultimosRegistros.map(registro => ({
      fecha: new Date(registro.fecha_hora).toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      }),
      animo: registro.nivel_animo || 5,
      intensidad: registro.intensidad_emocional || 5
    }));
  };

  const obtenerIconoEjercicio = (tipo) => {
    const iconos = {
      'respiracion': '🌬️',
      'meditacion': '🧘',
      'escritura': '✍️',
      'actividad_fisica': '🏃',
      'mindfulness': '🌸',
      'relajacion': '😌'
    };
    return iconos[tipo] || '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando información del paciente...</p>
          <p className="text-gray-500 text-sm mt-2">Esto puede tardar unos segundos...</p>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">No se pudo cargar la información del paciente</p>
          <button
            onClick={() => setCurrentView('pacientes')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Volver a Pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('pacientes')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Detalle del Paciente
            </h1>
            <p className="text-gray-600">
              {paciente.nombre} {paciente.apellido}
            </p>
          </div>
        </div>
      </div>

      {/* Información del paciente */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar y nombre */}
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {paciente.nombre?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {paciente.nombre} {paciente.apellido}
              </h2>
              <p className="text-gray-600">Paciente</p>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-2">
            {paciente.email && (
              <div className="flex items-center space-x-2 text-gray-700">
                <Mail className="w-5 h-5" />
                <span>{paciente.email}</span>
              </div>
            )}
            {paciente.telefono && (
              <div className="flex items-center space-x-2 text-gray-700">
                <Phone className="w-5 h-5" />
                <span>{paciente.telefono}</span>
              </div>
            )}
            {paciente.edad && (
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="w-5 h-5" />
                <span>{paciente.edad} años</span>
              </div>
            )}
          </div>

          {/* Estadísticas rápidas */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Estadísticas</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{registros.length}</span> registros emocionales
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{ejerciciosAsignados.length}</span> ejercicios asignados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setTabActiva('registros')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              tabActiva === 'registros'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Activity className="w-5 h-5 inline mr-2" />
            Registros Emocionales
          </button>
          <button
            onClick={() => setTabActiva('ejercicios')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              tabActiva === 'ejercicios'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Target className="w-5 h-5 inline mr-2" />
            Ejercicios Terapéuticos
          </button>
        </div>

        <div className="p-6">
          {tabActiva === 'registros' && (
            <div>
              {registros.length > 0 && (
                <>
                  {/* Gráfico */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Evolución del Estado de Ánimo
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepararDatosGrafico()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="animo" 
                          stroke="#6366f1" 
                          strokeWidth={2}
                          name="Nivel de ánimo"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista de registros */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Historial de Registros
                    </h3>
                    <div className="space-y-4">
                      {registros.slice(0, 10).map((registro) => (
                        <div
                          key={registro.id_registro}
                          className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-5 h-5 text-gray-600" />
                              <span className="text-sm text-gray-600">
                                {formatearFecha(registro.fecha_hora)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${obtenerColorAnimo(registro.nivel_animo)}`} />
                              <span className="text-2xl font-bold text-gray-800">{registro.nivel_animo || 5}/10</span>
                            </div>
                          </div>
                          {registro.notas && (
                            <div className="bg-white p-3 rounded-lg">
                              <p className="text-sm text-gray-700">{registro.notas}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {registros.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Sin registros emocionales
                  </h3>
                  <p className="text-gray-600">
                    El paciente aún no ha registrado su estado emocional
                  </p>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'ejercicios' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Ejercicios Asignados
                </h3>
                <button
                  onClick={abrirModalAsignar}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600"
                >
                  <Plus className="w-5 h-5" />
                  <span>Asignar Ejercicio</span>
                </button>
              </div>

              {ejerciciosAsignados.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No hay ejercicios asignados
                  </h3>
                  <p className="text-gray-600">
                    Asigna ejercicios terapéuticos para apoyar el tratamiento
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ejerciciosAsignados.map((asignacion) => (
                    <div key={asignacion.id_asignacion} className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-3xl">{obtenerIconoEjercicio(asignacion.ejercicio?.tipo)}</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{asignacion.ejercicio?.titulo || 'Ejercicio'}</h4>
                            <p className="text-sm text-gray-600">{asignacion.ejercicio?.duracion_minutos || 0} min</p>
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">
                                  Progreso: {asignacion.veces_completadas}/{asignacion.veces_requeridas}
                                </span>
                                <span className="text-xs font-bold text-indigo-600">
                                  {Math.round((asignacion.veces_completadas / asignacion.veces_requeridas) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${Math.min((asignacion.veces_completadas / asignacion.veces_requeridas) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {asignacion.estado === 'completado' && (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Asignar Ejercicio */}
      {mostrarModalAsignar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Asignar Ejercicio</h2>
            
            <form onSubmit={asignarEjercicio} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ejercicio *
                </label>
                <select
                  value={formAsignacion.id_ejercicio}
                  onChange={(e) => setFormAsignacion({...formAsignacion, id_ejercicio: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seleccionar ejercicio</option>
                  {catalogoEjercicios.map(ej => (
                    <option key={ej.id_ejercicio} value={ej.id_ejercicio}>
                      {obtenerIconoEjercicio(ej.tipo)} {ej.titulo} ({ej.duracion_minutos} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={formAsignacion.fecha_inicio}
                    onChange={(e) => setFormAsignacion({...formAsignacion, fecha_inicio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Fin *</label>
                  <input
                    type="date"
                    value={formAsignacion.fecha_fin}
                    onChange={(e) => setFormAsignacion({...formAsignacion, fecha_fin: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Veces Requeridas</label>
                  <input
                    type="number"
                    value={formAsignacion.veces_requeridas}
                    onChange={(e) => setFormAsignacion({...formAsignacion, veces_requeridas: e.target.value})}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Frecuencia</label>
                  <select
                    value={formAsignacion.frecuencia}
                    onChange={(e) => setFormAsignacion({...formAsignacion, frecuencia: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notas para el paciente</label>
                <textarea
                  value={formAsignacion.notas_psicologo}
                  onChange={(e) => setFormAsignacion({...formAsignacion, notas_psicologo: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Instrucciones o motivación adicional..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModalAsignar(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600"
                >
                  Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetallePaciente;