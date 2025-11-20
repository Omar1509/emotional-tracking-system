// frontend/src/components/Psicologo/PerfilPaciente.js

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, MessageCircle, TrendingUp, TrendingDown, AlertTriangle, Activity, Brain, Heart } from 'lucide-react';
import api from '../../config/api';

const PerfilPaciente = ({ paciente, onVolver }) => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diasAnalisis, setDiasAnalisis] = useState(30);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Obtener registros emocionales
        const responseRegistros = await api.get(`/pacientes/${paciente.id_usuario}/registros-emocionales?limit=100`);
        const registros = responseRegistros.data.registros || [];

        // Obtener análisis del chat
        const responseChat = await api.get(`/chat/analisis-paciente/${paciente.id_usuario}?dias=${diasAnalisis}`);
        const analisisChat = responseChat.data;

        // Calcular estadísticas
        calcularEstadisticas(registros, analisisChat);

      } catch (error) {
        console.error('Error cargando datos del paciente:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [paciente.id_usuario, diasAnalisis]);

  const calcularEstadisticas = (regs, chatData) => {
    // Agrupar por fecha
    const datosPorFecha = {};
    
    // Registros manuales
    regs.forEach(reg => {
      const fecha = new Date(reg.fecha_registro).toISOString().split('T')[0];
      if (!datosPorFecha[fecha]) {
        datosPorFecha[fecha] = {
          fecha,
          manual: { alegria: 0, tristeza: 0, ansiedad: 0, count: 0 },
          chat: { alegria: 0, tristeza: 0, ansiedad: 0, count: 0, riesgo: 0 }
        };
      }
      
      const emocion = reg.emocion_principal.toLowerCase();
      if (emocion === 'alegría' || emocion === 'alegria') {
        datosPorFecha[fecha].manual.alegria += reg.intensidad;
      } else if (emocion === 'tristeza') {
        datosPorFecha[fecha].manual.tristeza += reg.intensidad;
      } else if (emocion === 'ansiedad') {
        datosPorFecha[fecha].manual.ansiedad += reg.intensidad;
      }
      datosPorFecha[fecha].manual.count++;
    });

    // Datos del chat
    if (chatData && chatData.emociones_por_dia) {
      chatData.emociones_por_dia.forEach(dia => {
        const fecha = dia.fecha;
        if (!datosPorFecha[fecha]) {
          datosPorFecha[fecha] = {
            fecha,
            manual: { alegria: 0, tristeza: 0, ansiedad: 0, count: 0 },
            chat: { alegria: 0, tristeza: 0, ansiedad: 0, count: 0, riesgo: 0 }
          };
        }
        
        datosPorFecha[fecha].chat = {
          alegria: dia.alegria || 0,
          tristeza: dia.tristeza || 0,
          ansiedad: dia.ansiedad || 0,
          count: dia.total_mensajes || 0,
          riesgo: dia.nivel_riesgo_promedio || 0
        };
      });
    }

    // Promediar y preparar para gráficos
    const datosGrafico = Object.values(datosPorFecha)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map(d => {
        const manualCount = d.manual.count || 1;
        
        return {
          fecha: new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          'Alegría Manual': Math.round(d.manual.alegria / manualCount),
          'Alegría Chat': Math.round(d.chat.alegria),
          'Tristeza Manual': Math.round(d.manual.tristeza / manualCount),
          'Tristeza Chat': Math.round(d.chat.tristeza),
          'Ansiedad Manual': Math.round(d.manual.ansiedad / manualCount),
          'Ansiedad Chat': Math.round(d.chat.ansiedad),
          'Nivel Riesgo': Math.round(d.chat.riesgo)
        };
      });

    // Calcular tendencia
    let tendencia = 'estable';
    if (datosGrafico.length >= 7) {
      const ultimos7 = datosGrafico.slice(-7);
      const primeros7 = datosGrafico.slice(0, 7);
      
      const promedioReciente = ultimos7.reduce((sum, d) => 
        sum + d['Tristeza Manual'] + d['Ansiedad Manual'], 0) / (ultimos7.length * 2);
      const promedioAnterior = primeros7.reduce((sum, d) => 
        sum + d['Tristeza Manual'] + d['Ansiedad Manual'], 0) / (primeros7.length * 2);
      
      if (promedioReciente < promedioAnterior * 0.8) {
        tendencia = 'mejorando';
      } else if (promedioReciente > promedioAnterior * 1.2) {
        tendencia = 'empeorando';
      }
    }

    // Distribución de emociones
    const distribucion = {
      alegria: regs.filter(r => r.emocion_principal.toLowerCase().includes('alegr')).length,
      tristeza: regs.filter(r => r.emocion_principal.toLowerCase() === 'tristeza').length,
      ansiedad: regs.filter(r => r.emocion_principal.toLowerCase() === 'ansiedad').length,
      enojo: regs.filter(r => r.emocion_principal.toLowerCase() === 'enojo').length,
      miedo: regs.filter(r => r.emocion_principal.toLowerCase() === 'miedo').length,
      neutral: regs.filter(r => r.emocion_principal.toLowerCase() === 'neutral').length
    };

    setEstadisticas({
      datosGrafico,
      tendencia,
      distribucion,
      totalRegistros: regs.length,
      totalMensajes: chatData?.total_mensajes || 0,
      promedioRiesgo: chatData?.promedio_riesgo || 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const distribucionData = estadisticas ? [
    { name: 'Alegría', value: estadisticas.distribucion.alegria, color: '#10b981' },
    { name: 'Tristeza', value: estadisticas.distribucion.tristeza, color: '#ef4444' },
    { name: 'Ansiedad', value: estadisticas.distribucion.ansiedad, color: '#f59e0b' },
    { name: 'Enojo', value: estadisticas.distribucion.enojo, color: '#8b5cf6' },
    { name: 'Miedo', value: estadisticas.distribucion.miedo, color: '#06b6d4' },
    { name: 'Neutral', value: estadisticas.distribucion.neutral, color: '#6b7280' }
  ].filter(d => d.value > 0) : [];

  const getTendenciaColor = () => {
    if (!estadisticas) return 'bg-gray-100 text-gray-800';
    switch(estadisticas.tendencia) {
      case 'mejorando': return 'bg-green-100 text-green-800';
      case 'empeorando': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTendenciaIcono = () => {
    if (!estadisticas) return <Activity className="w-5 h-5" />;
    switch(estadisticas.tendencia) {
      case 'mejorando': return <TrendingUp className="w-5 h-5" />;
      case 'empeorando': return <TrendingDown className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getTendenciaTexto = () => {
    if (!estadisticas) return 'Sin datos';
    switch(estadisticas.tendencia) {
      case 'mejorando': return 'Estado emocional mejorando';
      case 'empeorando': return 'Requiere atención';
      default: return 'Estado emocional estable';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onVolver}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {paciente.nombre} {paciente.apellido}
              </h2>
              <p className="text-gray-600">{paciente.email}</p>
            </div>
          </div>
          
          <select
            value={diasAnalisis}
            onChange={(e) => setDiasAnalisis(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Última semana</option>
            <option value={30}>Último mes</option>
            <option value={90}>Últimos 3 meses</option>
          </select>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Registros Manuales</p>
              <p className="text-3xl font-bold text-blue-600">{estadisticas?.totalRegistros || 0}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mensajes en Chat</p>
              <p className="text-3xl font-bold text-purple-600">{estadisticas?.totalMensajes || 0}</p>
            </div>
            <MessageCircle className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nivel de Riesgo</p>
              <p className="text-3xl font-bold text-orange-600">
                {estadisticas?.promedioRiesgo?.toFixed(1) || '0.0'}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-500 opacity-50" />
          </div>
        </div>

        <div className={`rounded-lg shadow-md p-6 ${getTendenciaColor()}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tendencia</p>
              <p className="text-lg font-bold">{getTendenciaTexto()}</p>
            </div>
            {getTendenciaIcono()}
          </div>
        </div>
      </div>

      {/* Gráfico Comparativo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Brain className="w-6 h-6 mr-2 text-blue-600" />
          Comparación: Registro Manual vs Análisis de Chat
        </h3>
        
        {estadisticas && estadisticas.datosGrafico.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={estadisticas.datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Alegría Manual" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Alegría Chat" 
                stroke="#86efac" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tristeza Manual" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tristeza Chat" 
                stroke="#fca5a5" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Ansiedad Manual" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Ansiedad Chat" 
                stroke="#fcd34d" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No hay datos suficientes para mostrar el gráfico
          </div>
        )}
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Interpretación:</strong> Las líneas sólidas representan los registros manuales del paciente. 
            Las líneas punteadas muestran las emociones detectadas automáticamente en las conversaciones del chat.
            La concordancia entre ambas líneas sugiere buena conciencia emocional.
          </p>
        </div>
      </div>

      {/* Gráfico de Nivel de Riesgo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
          Nivel de Riesgo Detectado en Chat
        </h3>
        
        {estadisticas && estadisticas.datosGrafico.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={estadisticas.datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Nivel Riesgo" 
                stroke="#dc2626" 
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No hay datos de riesgo disponibles
          </div>
        )}
        
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-sm text-green-700 font-medium">Bajo (0-3)</p>
            <p className="text-xs text-green-600">Sin indicadores preocupantes</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <p className="text-sm text-yellow-700 font-medium">Medio (4-6)</p>
            <p className="text-xs text-yellow-600">Monitoreo recomendado</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-sm text-red-700 font-medium">Alto (7-10)</p>
            <p className="text-xs text-red-600">Intervención necesaria</p>
          </div>
        </div>
      </div>

      {/* Distribución de Emociones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <Heart className="w-6 h-6 mr-2 text-pink-600" />
            Distribución de Emociones
          </h3>
          
          {distribucionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribucionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">
              No hay datos de emociones
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Frecuencia de Emociones</h3>
          
          {distribucionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">
              No hay datos disponibles
            </div>
          )}
        </div>
      </div>

      {/* Notas Clínicas */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Notas para el Seguimiento Clínico</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• La comparación entre registros manuales y análisis de chat permite validar la auto-percepción emocional</p>
          <p>• Discrepancias significativas pueden indicar alexitimia o minimización de síntomas</p>
          <p>• El nivel de riesgo del chat complementa la evaluación clínica tradicional</p>
          <p>• Tendencias sostenidas requieren ajustes en el plan terapéutico</p>
          <p>• La distribución emocional ayuda a identificar patrones y áreas de trabajo prioritarias</p>
        </div>
      </div>
    </div>
  );
};

export default PerfilPaciente;