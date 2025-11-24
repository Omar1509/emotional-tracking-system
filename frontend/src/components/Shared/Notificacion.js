// frontend/src/components/Shared/Notificacion.js
// ✅ VERSIÓN ULTRA-CORREGIDA - Sin warning de jsx

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Notificacion = ({ tipo, titulo, descripcion, onClose, duracion = 5000, accion = null }) => {
  useEffect(() => {
    if (duracion && duracion > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duracion);
      return () => clearTimeout(timer);
    }
  }, [duracion, onClose]);

  const obtenerConfiguracion = () => {
    switch (tipo) {
      case 'exito':
      case 'success':
        return {
          container: "fixed top-5 right-5 w-full max-w-md bg-white rounded-xl shadow-2xl z-[9999] animate-slideIn border-l-4 border-green-500",
          icono: <CheckCircle className="w-6 h-6 text-green-500" />,
          iconoBg: "bg-green-100",
          tituloColor: "text-green-800",
          descripcionColor: "text-green-600",
          barraColor: "bg-green-500"
        };
      case 'error':
      case 'danger':
        return {
          container: "fixed top-5 right-5 w-full max-w-md bg-white rounded-xl shadow-2xl z-[9999] animate-slideIn border-l-4 border-red-500",
          icono: <XCircle className="w-6 h-6 text-red-500" />,
          iconoBg: "bg-red-100",
          tituloColor: "text-red-800",
          descripcionColor: "text-red-600",
          barraColor: "bg-red-500"
        };
      case 'advertencia':
      case 'warning':
        return {
          container: "fixed top-5 right-5 w-full max-w-md bg-white rounded-xl shadow-2xl z-[9999] animate-slideIn border-l-4 border-orange-500",
          icono: <AlertTriangle className="w-6 h-6 text-orange-500" />,
          iconoBg: "bg-orange-100",
          tituloColor: "text-orange-800",
          descripcionColor: "text-orange-600",
          barraColor: "bg-orange-500"
        };
      case 'info':
      default:
        return {
          container: "fixed top-5 right-5 w-full max-w-md bg-white rounded-xl shadow-2xl z-[9999] animate-slideIn border-l-4 border-blue-500",
          icono: <Info className="w-6 h-6 text-blue-500" />,
          iconoBg: "bg-blue-100",
          tituloColor: "text-blue-800",
          descripcionColor: "text-blue-600",
          barraColor: "bg-blue-500"
        };
    }
  };

  const config = obtenerConfiguracion();

  return (
    <>
      {/* ✅ Estilos globales sin el atributo jsx */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .progress-bar {
          animation: shrink ${duracion}ms linear;
        }
      `}</style>

      <div className={config.container}>
        <div className="flex items-start gap-4 p-5">
          {/* Icono */}
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconoBg}`}>
            {config.icono}
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-lg font-bold mb-1 ${config.tituloColor}`}>
              {titulo}
            </h4>
            <p className={`text-sm leading-relaxed ${config.descripcionColor}`}>
              {descripcion}
            </p>
            
            {/* Botón de acción opcional */}
            {accion && (
              <button
                onClick={accion.onClick}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tipo === 'exito' || tipo === 'success'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : tipo === 'error' || tipo === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : tipo === 'advertencia' || tipo === 'warning'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {accion.texto}
              </button>
            )}
          </div>
          
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso */}
        {duracion && duracion > 0 && (
          <div className="h-1 bg-gray-200 rounded-b-xl overflow-hidden">
            <div 
              className={`h-full progress-bar ${config.barraColor}`}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Notificacion;