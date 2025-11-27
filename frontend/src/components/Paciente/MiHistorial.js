// frontend/src/components/Paciente/MiHistorial.js
// ✅ COMPONENTE CORREGIDO - Compatible con tabla emociones_diarias

import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../config/api';
import Notificacion from '../Shared/Notificacion';

const MiHistorial = ({ setCurrentView }) => {
  const [registros, setRegistros] = useState([]);
  const [emocionesDiarias, setEmocionesDiarias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [periodo, setPeriodo] = useState(30); // 7, 30, 90 días

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));

      console.log('📡 Cargando datos para usuario:', user.id_usuario);

      // Cargar registros manuales
      try {
        const registrosResponse = await api.get('/registros-emocionales');
        setRegistros(registrosResponse.registros || []);
        console.log('✅ Registros manuales:', registrosResponse.registros?.length || 0);
      } catch (error) {
        console.error('❌ Error cargando registros manuales:', error);
        setRegistros([]);
      }

      // ✅ Cargar emociones diarias con estructura correcta
      try {
        console.log(`📡 Solicitando: /emociones-diarias/${user.id_usuario}?dias=${periodo}`);
        const emocionesResponse = await api.get(
          `/emociones-diarias/${user.id_usuario}?dias=${periodo}`
        );
        
        console.log('📦 Respuesta completa:', emocionesResponse);
        
        // ✅ Manejar diferentes formatos de respuesta
        let emocionesData = [];
        if (Array.isArray(emocionesResponse)) {
          emocionesData = emocionesResponse;
        } else if (emocionesResponse.emociones_diarias) {
          emocionesData = emocionesResponse.emociones_diarias;
        }

        console.log('✅ Emociones diarias cargadas:', emocionesData.length);
        setEmocionesDiarias(emocionesData);
        
        // Calcular estadísticas
        if (emocionesData.length > 0) {
          calcularEstadisticas(emocionesData);
        } else {
          setEstadisticas(null);
        }
      } catch (error) {
        console.error('❌ Error cargando emociones diarias:', error);
        console.error('Detalles del error:', error.response?.data || error.message);
        setEmocionesDiarias([]);
        setEstadisticas(null);
      }

    } catch (error) {
      console.error('❌ Error general cargando historial:', error);
      mostrarNotificacion('error', 'Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (emociones) => {
    if (!emociones || emociones.length === 0) {
      setEstadisticas(null);
      return;
    }

    console.log('📊 Calculando estadísticas con', emociones.length, 'registros');

    // Contar emociones dominantes
    const conteoEmociones = {};
    emociones.forEach(e => {
      const emocion = e.emocion_dominante || 'desconocida';
      conteoEmociones[emocion] = (conteoEmociones[emocion] || 0) + 1;
    });

    // Emoción más frecuente
    const emocionMasFrecuente = Object.keys(conteoEmociones).reduce((a, b) => 
      conteoEmociones[a] > conteoEmociones[b] ? a : b
    );

    // Promedios (convertir de 0-1 a 0-100 para mejor visualización)
    const promedios = {
      alegria: emociones.reduce((sum, e) => sum + parseFloat(e.alegria_promedio || 0), 0) / emociones.length,
      tristeza: emociones.reduce((sum, e) => sum + parseFloat(e.tristeza_promedio || 0), 0) / emociones.length,
      ansiedad: emociones.reduce((sum, e) => sum + parseFloat(e.ansiedad_promedio || 0), 0) / emociones.length,
      enojo: emociones.reduce((sum, e) => sum + parseFloat(e.enojo_promedio || 0), 0) / emociones.length,
      miedo: emociones.reduce((sum, e) => sum + parseFloat(e.miedo_promedio || 0), 0) / emociones.length
    };

    // Tendencia (comparar primera mitad vs segunda mitad)
    const mitad = Math.floor(emociones.length / 2);
    const primeraMetad = emociones.slice(0, mitad);
    const segundaMitad = emociones.slice(mitad);

    const promedioInicial = primeraMetad.reduce((sum, e) => 
      sum + parseFloat(e.alegria_promedio || 0), 0) / primeraMetad.length;
    const promedioFinal = segundaMitad.reduce((sum, e) => 
      sum + parseFloat(e.alegria_promedio || 0), 0) / segundaMitad.length;

    const tendencia = promedioFinal > promedioInicial + 0.1 ? 'mejorando' : 
                     promedioFinal < promedioInicial - 0.1 ? 'empeorando' : 'estable';

    const stats = {
      emocionMasFrecuente,
      conteoEmociones,
      promedios,
      tendencia,
      totalInteracciones: emociones.reduce((sum, e) => sum + parseInt(e.total_interacciones || 0), 0)
    };

    console.log('✅ Estadísticas calculadas:', stats);
    setEstadisticas(stats);
  };

  const mostrarNotificacion = (tipo, titulo, descripcion) => {
    setNotificacion({ tipo, titulo, descripcion });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const prepararDatosGraficoLinea = () => {
    if (!emocionesDiarias || emocionesDiarias.length === 0) return [];

    // Ordenar por fecha ascendente para el gráfico
    const datosOrdenados = [...emocionesDiarias].sort((a, b) => 
      new Date(a.fecha) - new Date(b.fecha)
    );

    return datosOrdenados.map(e => ({
      fecha: new Date(e.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      Alegría: (parseFloat(e.alegria_promedio || 0) * 100).toFixed(0),
      Tristeza: (parseFloat(e.tristeza_promedio || 0) * 100).toFixed(0),
      Ansiedad: (parseFloat(e.ansiedad_promedio || 0) * 100).toFixed(0),
      Enojo: (parseFloat(e.enojo_promedio || 0) * 100).toFixed(0),
      Miedo: (parseFloat(e.miedo_promedio || 0) * 100).toFixed(0)
    }));
  };

  const prepararDatosGraficoBarras = () => {
    if (!estadisticas) return [];

    return Object.keys(estadisticas.promedios).map(emocion => ({
      emocion: emocion.charAt(0).toUpperCase() + emocion.slice(1),
      valor: (estadisticas.promedios[emocion] * 100).toFixed(1)
    }));
  };

  const obtenerEmojiEmocion = (emocion) => {
    const emojis = {
      'tristeza': '😢',
      'alegria': '😊',
      'alegría': '😊',
      'enojo': '😠',
      'miedo': '😰',
      'ansiedad': '😰',
      'neutral': '😐',
      'desconocida': '❓'
    };
    return emojis[emocion?.toLowerCase()] || '😊';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-800">Cargando tu historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {notificacion && (
        <Notificacion
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          descripcion={notificacion.descripcion}
          onClose={() => setNotificacion(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📈 Mi Historial Emocional</h1>
            <p className="text-gray-600">Seguimiento de tu bienestar a lo largo del tiempo</p>
          </div>

          <div className="w-24"></div>
        </div>

        {/* Filtro de periodo */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setPeriodo(7)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                periodo === 7
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setPeriodo(30)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                periodo === 30
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setPeriodo(90)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                periodo === 90
                  ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Días
            </button>
          </div>
        </div>

        {/* Estadísticas generales */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Emoción más frecuente */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Emoción Más Frecuente</h3>
              <div className="flex items-center justify-center py-4">
                <div className="text-6xl">
                  {obtenerEmojiEmocion(estadisticas.emocionMasFrecuente)}
                </div>
              </div>
              <p className="text-xl font-bold text-center text-gray-800 capitalize">
                {estadisticas.emocionMasFrecuente}
              </p>
              <p className="text-center text-gray-600 text-sm mt-2">
                {estadisticas.conteoEmociones[estadisticas.emocionMasFrecuente]} de {emocionesDiarias.length} días
              </p>
            </div>

            {/* Tendencia */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Tendencia General</h3>
              <div className="flex items-center justify-center py-4">
                {estadisticas.tendencia === 'mejorando' ? (
                  <TrendingUp className="w-16 h-16 text-green-500" />
                ) : estadisticas.tendencia === 'empeorando' ? (
                  <TrendingDown className="w-16 h-16 text-red-500" />
                ) : (
                  <Activity className="w-16 h-16 text-yellow-500" />
                )}
              </div>
              <p className={`text-xl font-bold text-center capitalize ${
                estadisticas.tendencia === 'mejorando' ? 'text-green-600' :
                estadisticas.tendencia === 'empeorando' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {estadisticas.tendencia}
              </p>
            </div>

            {/* Total interacciones */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Interacciones con el Chat</h3>
              <div className="flex items-center justify-center py-4">
                <p className="text-6xl font-bold text-indigo-600">
                  {estadisticas.totalInteracciones}
                </p>
              </div>
              <p className="text-center text-gray-600">
                Conversaciones analizadas
              </p>
            </div>
          </div>
        )}

        {/* Gráfico de evolución */}
        {emocionesDiarias.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Evolución Emocional</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={prepararDatosGraficoLinea()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis domain={[0, 100]} label={{ value: 'Intensidad (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Alegría" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Tristeza" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Ansiedad" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Enojo" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="Miedo" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de promedios */}
        {estadisticas && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Promedios por Emoción</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepararDatosGraficoBarras()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="emocion" />
                <YAxis domain={[0, 100]} label={{ value: 'Promedio (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="valor" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sin datos */}
        {emocionesDiarias.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No hay datos disponibles
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza a usar el chatbot para que podamos analizar tu estado emocional
            </p>
            <button
              onClick={() => setCurrentView('chat')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-400 to-purple-400 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 font-semibold transition-all"
            >
              Ir al Chatbot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiHistorial;