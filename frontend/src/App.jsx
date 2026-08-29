import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import NovoPedido from './pages/NovoPedido';
import Pedidos from './pages/Pedidos';
import Cozinha from './pages/Cozinha';
import TVBalcao from './pages/TVBalcao';
import Caixa from './pages/Caixa';
import Delivery from './pages/Delivery';
import Clientes from './pages/Clientes';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';
import Auditoria from './pages/Auditoria';
import ConfiguracaoImpressora from './pages/ConfiguracaoImpressora';
import { useAuth } from './lib/store';

export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/pedido" replace /> : <Login />} />
      {/* Tela de TV é isolada (tela cheia, sem cabeçalho/navegação) */}
      <Route path="/tv" element={<TVBalcao />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/pedido" element={<ProtectedRoute papeis={['gerente', 'caixa']}><NovoPedido /></ProtectedRoute>} />
        <Route path="/pedidos" element={<ProtectedRoute papeis={['gerente', 'caixa']}><Pedidos /></ProtectedRoute>} />
        <Route path="/cozinha" element={<ProtectedRoute papeis={['gerente', 'cozinha', 'caixa']}><Cozinha /></ProtectedRoute>} />
        <Route path="/caixa" element={<ProtectedRoute papeis={['gerente', 'caixa']}><Caixa /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute papeis={['gerente', 'entregador', 'caixa']}><Delivery /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute papeis={['gerente', 'caixa']}><Clientes /></ProtectedRoute>} />
        <Route path="/estoque" element={<ProtectedRoute papeis={['gerente']}><Estoque /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute papeis={['gerente']}><Relatorios /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute papeis={['gerente']}><Auditoria /></ProtectedRoute>} />
        <Route path="/configuracoes/impressora" element={<ProtectedRoute papeis={['gerente', 'caixa']}><ConfiguracaoImpressora /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={usuario ? '/pedido' : '/login'} replace />} />
    </Routes>
  );
}
