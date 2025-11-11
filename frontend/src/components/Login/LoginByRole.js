import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { login } from '../../config/api';

const LoginByRole = ({ selectedRole, onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleConfig = {
    admin: {
      title: 'Administrador',
      icon: '👑',
      gradient: 'from-purple-500 to-purple-600',
      focusColor: 'focus:ring-purple-500',
      buttonGradient: 'from-purple-600 to-purple-700',
      testUser: 'admin@sistema.com',
      testPass: 'Admin123!'
    },
    psicologo: {
      title: 'Psicólogo',
      icon: '👨‍⚕️',
      gradient: 'from-blue-500 to-blue-600',
      focusColor: 'focus:ring-blue-500',
      buttonGradient: 'from-blue-600 to-blue-700',
      testUser: 'psicologo@test.com',
      testPass: 'password123'
    },
    paciente: {
      title: 'Paciente',
      icon: '👤',
      gradient: 'from-emerald-500 to-emerald-600',
      focusColor: 'focus:ring-emerald-500',
      buttonGradient: 'from-emerald-600 to-emerald-700',
      testUser: 'jperez@sistema.com',
      testPass: 'password123'
    }
  };

  const config = roleConfig[selectedRole];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      
      // VALIDACIÓN: Verificar que el rol coincida
      if (data.role !== selectedRole) {
        throw new Error(`Este usuario no tiene permisos de ${config.title}. Por favor, selecciona el rol correcto.`);
      }

      // ✅ GUARDAR TOKEN Y DATOS EN LOCALSTORAGE
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      if (data.nombre_completo) {
        localStorage.setItem('nombre_completo', data.nombre_completo);
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async () => {
    setEmail(config.testUser);
    setPassword(config.testPass);
    setError('');
    setLoading(true);

    try {
      const data = await login(config.testUser, config.testPass);
      
      if (data.role !== selectedRole) {
        throw new Error(`Error: Usuario de prueba no coincide con el rol.`);
      }

      // ✅ GUARDAR TOKEN Y DATOS EN LOCALSTORAGE
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      if (data.nombre_completo) {
        localStorage.setItem('nombre_completo', data.nombre_completo);
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} p-4`}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Cambiar rol
        </button>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{config.icon}</div>
          <h2 className={`text-3xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-2`}>
            Acceso {config.title}
          </h2>
          <p className="text-gray-600">Ingresa tus credenciales</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p className="font-semibold">Error de autenticación</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario / Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${config.focusColor} focus:border-transparent focus:outline-none`}
              placeholder={`${config.title}...`}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${config.focusColor} focus:border-transparent focus:outline-none`}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r ${config.buttonGradient} text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="border-t pt-6">
          <p className="text-center text-sm text-gray-600 mb-3">Prueba rápida:</p>
          <button
            onClick={quickLogin}
            disabled={loading}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            ⚡ Login rápido de {config.title}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Usuario: {config.testUser}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginByRole;