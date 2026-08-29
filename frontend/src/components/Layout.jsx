import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth, useTema, useConexao } from '../lib/store';

const LINKS = [
  { to: '/pedido', label: 'Novo Pedido', icone: '🥟', papeis: ['admin', 'gerente', 'caixa'] },
  { to: '/pedidos', label: 'Pedidos', icone: '📋', papeis: ['admin', 'gerente', 'caixa'] },
  { to: '/cozinha', label: 'Cozinha', icone: '🍳', papeis: ['admin', 'gerente', 'cozinha', 'caixa'] },
  { to: '/tv', label: 'TV Balcão', icone: '📺', papeis: ['admin', 'gerente', 'caixa'] },
  { to: '/caixa', label: 'Caixa', icone: '💰', papeis: ['admin', 'gerente', 'caixa'] },
  { to: '/delivery', label: 'Delivery', icone: '🛵', papeis: ['admin', 'gerente', 'entregador', 'caixa'] },
  { to: '/clientes', label: 'Clientes', icone: '👤', papeis: ['admin', 'gerente', 'caixa'] },
  { to: '/estoque', label: 'Estoque', icone: '📦', papeis: ['admin', 'gerente'] },
  { to: '/relatorios', label: 'Relatórios', icone: '📊', papeis: ['admin', 'gerente'] },
  { to: '/auditoria', label: 'Auditoria', icone: '🛡️', papeis: ['admin', 'gerente'] },
  { to: '/configuracoes/impressora', label: 'Impressora', icone: '🖨️', papeis: ['admin', 'gerente', 'caixa'] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { escuro, alternar } = useTema();
  const { online, pendentesSincronizar } = useConexao();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro);
  }, [escuro]);

  const linksVisiveis = LINKS.filter((l) => usuario.papel === 'admin' || l.papeis.includes(usuario.papel));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-30 bg-marca-800 dark:bg-marca-950 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-2">
          <img src="/logo.svg" alt="Kina Kana" className="w-12 h-12 rounded-full bg-white shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-lg leading-tight truncate">Kina Kana</h1>
            <p className="text-[11px] text-marca-100 -mt-0.5">Sistema de Balcão</p>
          </div>

          {!online && (
            <span className="text-xs bg-red-600 px-2 py-1 rounded-full font-semibold whitespace-nowrap">
              ⚠ Offline {pendentesSincronizar > 0 ? `(${pendentesSincronizar} pendente${pendentesSincronizar > 1 ? 's' : ''})` : ''}
            </span>
          )}
          {online && pendentesSincronizar > 0 && (
            <span className="text-xs bg-amber-500 px-2 py-1 rounded-full font-semibold whitespace-nowrap">
              ⏳ Sincronizando {pendentesSincronizar}...
            </span>
          )}

          <button onClick={alternar} className="btn-toque text-xl w-10 h-10 rounded-full hover:bg-marca-700" title="Alternar modo claro/escuro">
            {escuro ? '☀️' : '🌙'}
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{usuario.nome}</p>
            <p className="text-[11px] text-marca-100 leading-tight capitalize">{usuario.papel}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn-toque text-sm bg-marca-900/60 hover:bg-marca-900 px-3 py-2 rounded-lg font-medium"
          >
            Sair
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 scrollbar-none">
          {linksVisiveis.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `btn-toque flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-white text-marca-800' : 'bg-marca-700/50 hover:bg-marca-700 text-white'
                }`
              }
            >
              <span>{l.icone}</span> {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  );
}
