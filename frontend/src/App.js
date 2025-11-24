// frontend/src/App.js
// ✅ VERSIÓN ACTUALIZADA CON MI HISTORIAL

import React, { useState, useEffect } from 'react';
import './index.css';

// Componentes de Login
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
import GestionPacientes from './components/Psicologo/GestionPacientes';
import GestionCitas from './components/Psicologo/GestionCitas';

// Componentes Paciente
import DashboardPaciente from './components/Paciente/DashboardPaciente';
import ChatApoyoRasa from './components/Paciente/ChatApoyoRasa';
import MisCitas from './components/Paciente/MisCitas';
import MisEjercicios from './components/Paciente/MisEjercicios';
import MiHistorial from './components/Paciente/MiHistorial'; // ✅ NUEVO

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
          <GestionPacientes 
            setCurrentView={setCurrentView} 
            setSelectedPacienteId={setSelectedPatientId} 
          />
        );
      }
      
      if (currentView === 'citas') {
        return <GestionCitas setCurrentView={setCurrentView} />;
      }
      
      return (
        <DashboardPsicologo 
          setCurrentView={setCurrentView}
          setSelectedPacienteId={setSelectedPatientId}
        />
      );
    }
    
    // ============= PACIENTE =============
    if (userRole === 'paciente') {
      if (currentView === 'chat') {
        return <ChatApoyoRasa setCurrentView={setCurrentView} />;
      }
      
      if (currentView === 'citas') {
        return <MisCitas setCurrentView={setCurrentView} />;
      }
      
      if (currentView === 'ejercicios') {
        return <MisEjercicios setCurrentView={setCurrentView} />;
      }
      
      // ✅ NUEVO: Mi Historial Emocional
      if (currentView === 'historial') {
        return <MiHistorial setCurrentView={setCurrentView} />;
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