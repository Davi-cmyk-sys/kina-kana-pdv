import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/store';

export default function ProtectedRoute({ papeis, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (papeis && usuario.papel !== 'admin' && !papeis.includes(usuario.papel)) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-red-600">Acesso não permitido para o seu perfil ({usuario.papel}).</p>
      </div>
    );
  }
  return children;
}
