// frontend/src/App.js
// ✅ VERSIÓN CORREGIDA - IMPORTS ARREGLADOS

import React, { useState, useEffect } from 'react';
import './index.css';

// ✅ CORRECCIÓN: Solo importar los componentes que existen
import RoleSelector from './components/Login/RoleSelector';
import LoginByRole from './components/Login/LoginByRole';
import Sidebar from './components/Shared/Sidebar';

// Componentes Admin
import DashboardAdmin from './components/Admin/DashboardAdmin';
import GestionPsicologos from './components/Admin/GestionPsicologos';
import DetallePsicologo from './components/Admin/DetallePsicologo';
import FormularioRegistroPsicologo from './components/Admin/FormularioRegistroPsicologo';
import ReportesAdmin from './components/Admin/ReportesAdmin';

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
import MiHistorial from './components/Paciente/MiHistorial';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPsicologoId, setSelectedPsicologoId] = useState(null);

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
    setSelectedPsicologoId(null);
  };

  const handleBackToRoleSelector = () => {
    setSelectedRole(null);
  };

  // ============================================
  // RENDERIZADO DE VISTAS POR ROL
  // ============================================

  const renderView = () => {
    // ============= ADMIN =============
    if (userRole === 'admin') {
      switch (currentView) {
        case 'dashboard':
          return <DashboardAdmin setCurrentView={setCurrentView} />;
        
        case 'psicologos':
          return (
            <GestionPsicologos 
              setCurrentView={setCurrentView}
              setSelectedPsicologoId={setSelectedPsicologoId}
            />
          );
        
        case 'detalle-psicologo':
          if (!selectedPsicologoId) {
            setCurrentView('psicologos');
            return null;
          }
          return (
            <DetallePsicologo 
              psicologoId={selectedPsicologoId}
              setCurrentView={setCurrentView}
            />
          );
        
        case 'registrar-psicologo':
          return <FormularioRegistroPsicologo setCurrentView={setCurrentView} />;
        
        case 'reportes':
          return <ReportesAdmin />;
        
        default:
          return <DashboardAdmin setCurrentView={setCurrentView} />;
      }
    }
    
    // ============= PSICÓLOGO =============
    if (userRole === 'psicologo') {
      switch (currentView) {
        case 'dashboard':
          return (
            <DashboardPsicologo 
              setCurrentView={setCurrentView}
              setSelectedPacienteId={setSelectedPatientId}
            />
          );
        
        case 'registrar-paciente':
          return <FormularioRegistroPaciente setCurrentView={setCurrentView} />;
        
        case 'pacientes':
          return (
            <GestionPacientes 
              setCurrentView={setCurrentView} 
              setSelectedPacienteId={setSelectedPatientId} 
            />
          );
        
        case 'detalle-paciente':
          if (!selectedPatientId) {
            setCurrentView('pacientes');
            return null;
          }
          return (
            <DetallePaciente 
              pacienteId={selectedPatientId} 
              setCurrentView={setCurrentView}
            />
          );
        
        case 'citas':
          return <GestionCitas setCurrentView={setCurrentView} />;
        
        default:
          return (
            <DashboardPsicologo 
              setCurrentView={setCurrentView}
              setSelectedPacienteId={setSelectedPatientId}
            />
          );
      }
    }
    
    // ============= PACIENTE =============
    if (userRole === 'paciente') {
      switch (currentView) {
        case 'dashboard':
          return <DashboardPaciente setCurrentView={setCurrentView} />;
        
        case 'chat':
          return <ChatApoyoRasa setCurrentView={setCurrentView} />;
        
        case 'citas':
          return <MisCitas setCurrentView={setCurrentView} />;
        
        case 'ejercicios':
          return <MisEjercicios setCurrentView={setCurrentView} />;
        
        case 'historial':
          return <MiHistorial setCurrentView={setCurrentView} />;
        
        default:
          return <DashboardPaciente setCurrentView={setCurrentView} />;
      }
    }
    
    // Si no hay rol reconocido
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Rol no reconocido</h2>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDERIZADO PRINCIPAL
  // ============================================

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