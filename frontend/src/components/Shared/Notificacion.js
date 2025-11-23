// frontend/src/components/Shared/Notificacion.js
// ✅ SIN CSS EXTERNO - SOLO TAILWIND

import React, { useEffect } from 'react';

const Notificacion = ({ tipo, titulo, descripcion, onClose, duracion = 5000 }) => {
  useEffect(() => {
    if (duracion && duracion > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duracion);
      return () => clearTimeout(timer);
    }
  }, [duracion, onClose]);

  const obtenerIcono = () => {
    switch (tipo) {
      case 'exito':
        return '✓';
      case 'error':
        return '✗';
      case 'advertencia':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  const obtenerEstilos = () => {
    const estilosBase = "fixed top-5 right-5 w-full max-w-md flex items-center gap-4 p-5 bg-white rounded-xl shadow-2xl z-[9999] animate-slideIn border-l-[5px]";
    
    switch (tipo) {
      case 'exito':
        return {
          container: `${estilosBase} border-l-green-500`,
          icono: "w-11 h-11 rounded-full flex items-center justify-center text-2xl font-bold bg-green-100 text-green-600",
        };
      case 'error':
        return {
          container: `${estilosBase} border-l-red-500`,
          icono: "w-11 h-11 rounded-full flex items-center justify-center text-2xl font-bold bg-red-100 text-red-600",
        };
      case 'advertencia':
        return {
          container: `${estilosBase} border-l-orange-500`,
          icono: "w-11 h-11 rounded-full flex items-center justify-center text-2xl font-bold bg-orange-100 text-orange-600",
        };
      case 'info':
        return {
          container: `${estilosBase} border-l-blue-500`,
          icono: "w-11 h-11 rounded-full flex items-center justify-center text-2xl font-bold bg-blue-100 text-blue-600",
        };
      default:
        return {
          container: `${estilosBase} border-l-gray-500`,
          icono: "w-11 h-11 rounded-full flex items-center justify-center text-2xl font-bold bg-gray-100 text-gray-600",
        };
    }
  };

  const estilos = obtenerEstilos();

  return (
    <div className={estilos.container}>
      <div className={estilos.icono}>
        {obtenerIcono()}
      </div>
      
      <div className="flex-1">
        <h4 className="text-lg font-bold text-gray-800 mb-1">
          {titulo}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {descripcion}
        </p>
      </div>
      
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center text-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
      >
        ×
      </button>

      {/* Agregar animación slideIn al index.css o aquí inline */}
      <style jsx>{`
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
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Notificacion;