// frontend/src/components/Psicologo/AnalisisEmocionalAvanzado.js

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import api from '../../config/api';

const AnalisisEmocionalAvanzado = ({ pacienteId, onClose }) => {
  const [analisis, setAnalisis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    cargarAnalisis();
  }, [pacienteId, dias]);

  const cargarAnalisis = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pacientes/${pacienteId}/analisis-emocional-avanzado?dias=${dias}`);
      setAnalisis(response.data);
    } catch (error) {
      console.error('Error cargando análisis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analisis) {
    return (
      <div className="text-center text-gray-500 py-12">
        No hay datos disponibles
      </div>
    );
  }

  const { comparacion_diaria, estadisticas, emociones_mas_frecuentes } = analisis;

  // Preparar datos para gráfico comparativo
  const datosComparacion = comparacion_diaria.map(d => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    'Alegría (Manual)': d.manual.alegria,
    'Alegría (Chat)': d.chat.alegria,
    'Tristeza (Manual)': d.manual.tristeza,
    'Tristeza (Chat)': d.chat.tristeza,
    'Ansiedad (Manual)': d.manual.ansiedad,
    'Ansiedad (Chat)': d.chat.ansiedad,
    'Nivel de Riesgo': d.nivel_riesgo
  }));

  // Tendencia
  const getTendenciaIcon = () => {
    switch(estadisticas.tendencia) {
      case 'mejorando':
        return <TrendingUp className="text-green-500" />;
      case 'empeorando':
        return <TrendingDown className="text-red-500" />;
      default:
        return <Minus className="text-gray-500" />;
    }
  };

  const getTendenciaColor = () => {
    switch(estadisticas.tendencia) {
      case 'mejorando':
        return 'bg-green-100 text-green-800';
      case 'empeorando':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTendenciaTexto = () => {
    switch(estadisticas.tendencia) {
      case 'mejorando':
        return 'Estado emocional mejorando';
      case 'empeorando':
        return 'Estado emocional requiere atención';
      default:
        return 'Estado emocional estable';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Análisis Emocional Avanzado</h2>
        <div className="flex items-center space-x-4">
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value={7}>Última semana</option>
            <option value={30}>Último mes</option>
            <option value={90}>Últimos 3 meses</option>
          </select>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Registros Manuales</p>
              <p className="text-2xl font-bold text-blue-600">{estadisticas.total_registros_manuales}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mensajes Chat</p>
              <p className="text-2xl font-bold text-purple-600">{estadisticas.total_mensajes_chat}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emoción Dominante</p>
              <p className="text-xl font-bold text-green-600 capitalize">{estadisticas.emocion_dominante}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${getTendenciaColor()}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Tendencia</p>
              <p className="text-lg font-bold">{getTendenciaTexto()}</p>
            </div>
            {getTendenciaIcon()}
          </div>
        </div>
      </div>

      {/* Gráfico Comparativo: Manual vs Chat */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Comparación: Registro Manual vs Chat</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={datosComparacion}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Alegría (Manual)" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="Alegría (Chat)" stroke="#86efac" strokeWidth={2} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Tristeza (Manual)" stroke="#ef4444" strokeWidth={2} />
            <Line type="monotone" dataKey="Tristeza (Chat)" stroke="#fca5a5" strokeWidth={2} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Ansiedad (Manual)" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="Ansiedad (Chat)" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-2 text-center">
          💡 Las líneas sólidas representan registros manuales. Las líneas punteadas representan emociones detectadas en el chat.
        </p>
      </div>

      {/* Nivel de Riesgo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Nivel de Riesgo (Detectado en Chat)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={datosComparacion}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Nivel de Riesgo" stroke="#dc2626" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Emociones Más Frecuentes */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Emociones Más Frecuentes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={emociones_mas_frecuentes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="emocion" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretación */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">📊 Interpretación Clínica</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• La comparación entre registros manuales y chat ayuda a validar la consistencia emocional</li>
          <li>• Discrepancias significativas pueden indicar falta de conciencia emocional o minimización</li>
          <li>• El nivel de riesgo del chat complementa la evaluación clínica tradicional</li>
          <li>• Tendencias sostenidas requieren ajustes en el plan terapéutico</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalisisEmocionalAvanzado;