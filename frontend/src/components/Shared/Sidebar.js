// frontend/src/components/Shared/Sidebar.js
// ✅ VERSIÓN ACTUALIZADA CON NUEVAS OPCIONES DE MENÚ

import React from 'react';
import { Home, Users, Plus, MessageCircle, BarChart3, LogOut, Calendar, FileText, Activity, Target } from 'lucide-react';

const Sidebar = ({ userRole, onLogout, currentView, setCurrentView }) => {
  const nombreCompleto = localStorage.getItem('nombre_completo');

  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'registrar-psicologo', label: 'Registrar Psicólogo', icon: Plus }
    ],
    psicologo: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'pacientes', label: 'Mis Pacientes', icon: Users },
      { id: 'registrar-paciente', label: 'Registrar Paciente', icon: Plus },
      { id: 'citas', label: 'Gestión de Citas', icon: Calendar },
    ],
    paciente: [
      { id: 'dashboard', label: 'Inicio', icon: Home },
      // ❌ ELIMINADO: { id: 'registrar', label: 'Registrar Estado', icon: Plus },
      { id: 'chat', label: 'Chat de Apoyo', icon: MessageCircle },
      { id: 'citas', label: 'Mis Citas', icon: Calendar }, // ✅ NUEVO
      { id: 'ejercicios', label: 'Mis Ejercicios', icon: Target }, // ✅ NUEVO
      { id: 'historial', label: 'Mi Historial', icon: BarChart3 }, // ✅ MOVIDO AQUÍ
    ]
  };

  const items = menuItems[userRole] || [];

  return (
    <div className="w-64 h-screen bg-white shadow-lg fixed left-0 top-0 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-blue-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Sistema Emocional
            </h1>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Menú de navegación */}
      <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                currentView === item.id 
                  ? 'bg-gradient-to-r from-emerald-50 to-blue-50 text-emerald-700 border-l-4 border-emerald-500' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer con info del usuario y logout */}
      <div className="p-4 border-t">
        <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-100">
          <p className="text-xs text-gray-500">Sesión iniciada como:</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{nombreCompleto}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;