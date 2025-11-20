// frontend/src/App.js
// REEMPLAZAR TODO EL ARCHIVO

import React, { useState, useEffect } from 'react';
import './index.css';

// Importar desde components/ dentro de src/
import RoleSelector from './components/Login/RoleSelector';
import LoginByRole from './components/Login/LoginByRole';
import Sidebar from './components/Shared/Sidebar';

// Componentes Admin
import DashboardAdmin from './components/Admin/DashboardAdmin';
import FormularioRegistroPsicologo from './components/Admin/FormularioRegistroPsicologo';

// Componentes Psicólogo
import DashboardPsicologo from './components/Psicologo/DashboardPsicologo';
import FormularioRegistroPaciente from './components/Psicologo/FormularioRegistroPaciente';
import DetallePaciente from './components/Psicologo/DetallePaciente';

// Componentes Paciente
import DashboardPaciente from './components/Paciente/DashboardPaciente';
import RegistroEmocional from './components/Paciente/RegistroEmocional';
import ChatApoyoRasa from './components/Paciente/ChatApoyoRasa';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setUserRole(userData.rol);
    }
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
  };

  const handleLogin = (data) => {
    if (data.nombre_completo) {
      localStorage.setItem('nombre_completo', data.nombre_completo);
    }
    setIsAuthenticated(true);
    setUserRole(data.role);
    setSelectedRole(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentView('dashboard');
    setSelectedRole(null);
    setSelectedPatientId(null);
  };

  const handleBackToRoleSelector = () => {
    setSelectedRole(null);
  };

  if (!isAuthenticated) {
    if (!selectedRole) {
      return <RoleSelector onSelectRole={handleSelectRole} />;
    }
    return (
      <LoginByRole 
        selectedRole={selectedRole} 
        onLogin={handleLogin}
        onBack={handleBackToRoleSelector}
      />
    );
  }

  const renderView = () => {
    // ============= ADMIN =============
    if (userRole === 'admin') {
      if (currentView === 'registrar-psicologo') {
        return <FormularioRegistroPsicologo setCurrentView={setCurrentView} />;
      }
      return <DashboardAdmin setCurrentView={setCurrentView} />;
    }
    
    // ============= PSICÓLOGO =============
    if (userRole === 'psicologo') {
      if (currentView === 'registrar-paciente') {
        return <FormularioRegistroPaciente setCurrentView={setCurrentView} />;
      }
      
      if (currentView === 'detalle-paciente' && selectedPatientId) {
        return (
          <DetallePaciente 
            pacienteId={selectedPatientId} 
            setCurrentView={setCurrentView}
          />
        );
      }
      
      if (currentView === 'pacientes') {
        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Lista de Pacientes</h2>
            <p className="text-gray-600">Próximamente: Vista completa de pacientes</p>
          </div>
        );
      }
      
      if (currentView === 'citas') {
        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Agenda de Citas</h2>
            <p className="text-gray-600">Próximamente: Calendario de citas</p>
          </div>
        );
      }
      
      // ✅ CORREGIDO: Pasar setSelectedPatientId
      return (
        <DashboardPsicologo 
          setCurrentView={setCurrentView}
          setSelectedPacienteId={setSelectedPatientId}
        />
      );
    }
    
    // ============= PACIENTE =============
    if (userRole === 'paciente') {
      if (currentView === 'registrar') {
        return <RegistroEmocional setCurrentView={setCurrentView} />;
      }
      
      if (currentView === 'chat') {
        return <ChatApoyoRasa setCurrentView={setCurrentView} />;
      }
      
      if (currentView === 'estadisticas') {
        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Mis Estadísticas</h2>
            <p className="text-gray-600">Próximamente: Gráficos y análisis detallado</p>
          </div>
        );
      }
      
      return <DashboardPaciente setCurrentView={setCurrentView} />;
    }
    
    return <div className="text-center p-8">Rol no reconocido</div>;
  };

  return (
    <div className="flex">
      <Sidebar 
        userRole={userRole} 
        onLogout={handleLogout} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
      />
      <div className="ml-64 flex-1 p-8 bg-gray-50 min-h-screen">
        {renderView()}
      </div>
    </div>
  );
};

export default App;