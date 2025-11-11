import React from 'react';

const RoleSelector = ({ onSelectRole }) => {
  const roles = [
    {
      id: 'admin',
      title: 'Administrador',
      icon: '👑',
      description: 'Gestión del sistema',
      subtitle: 'Administra usuarios y configuración',
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
      borderColor: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      bgHover: 'hover:bg-purple-50'
    },
    {
      id: 'psicologo',
      title: 'Psicólogo',
      icon: '👨‍⚕️',
      description: 'Panel profesional',
      subtitle: 'Gestiona pacientes y sesiones',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
      borderColor: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      bgHover: 'hover:bg-blue-50'
    },
    {
      id: 'paciente',
      title: 'Paciente',
      icon: '👤',
      description: 'Acceso personal',
      subtitle: 'Registra y sigue tu progreso',
      gradient: 'from-emerald-500 to-emerald-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
      borderColor: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      bgHover: 'hover:bg-emerald-50'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">💚</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Sistema de Seguimiento Emocional
          </h1>
          <p className="text-gray-600 text-lg">Selecciona tu tipo de acceso</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className={`group p-6 border-2 ${role.borderColor} ${role.hoverBorder} ${role.bgHover} rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl`}
            >
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                {role.icon}
              </div>
              <div className={`font-bold text-xl mb-2 bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}>
                {role.title}
              </div>
              <div className="text-sm text-gray-600 mb-2">{role.description}</div>
              <div className="text-xs text-gray-500">{role.subtitle}</div>
              <div className={`mt-4 py-2 px-4 bg-gradient-to-r ${role.gradient} ${role.hoverGradient} text-white rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100`}>
                Iniciar Sesión →
              </div>
            </button>
          ))}
        </div>

       
      </div>
    </div>
  );
};

export default RoleSelector;