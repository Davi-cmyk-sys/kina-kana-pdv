import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/store';

const USUARIOS_DEMO = [
  { papel: 'Administrador', email: 'admin@kinakana.com.br' },
  { papel: 'Gerente', email: 'gerente@kinakana.com.br' },
  { papel: 'Caixa / Atendente', email: 'caixa@kinakana.com.br' },
  { papel: 'Cozinha', email: 'cozinha@kinakana.com.br' },
  { papel: 'Entregador', email: 'entregador@kinakana.com.br' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('caixa@kinakana.com.br');
  const [senha, setSenha] = useState('123456');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/pedido');
    } catch (e) {
      setErro(e.message || 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-marca-800 via-marca-700 to-marca-900 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Kina Kana" className="w-24 h-24 rounded-full shadow-card mb-2" />
          <h1 className="text-2xl font-display font-extrabold text-marca-800 dark:text-marca-300">Kina Kana</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sistema de Balcão</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-4 py-3 text-base focus:border-marca-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Senha</label>
            <input
              type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-4 py-3 text-base focus:border-marca-600 outline-none"
            />
          </div>

          {erro && <p className="text-red-600 text-sm font-semibold">{erro}</p>}

          <button
            type="submit" disabled={carregando}
            className="btn-toque w-full bg-marca-700 hover:bg-marca-800 disabled:opacity-60 text-white font-bold text-lg py-3 rounded-xl shadow-card"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <p className="text-xs text-neutral-400 mb-2">Usuários de demonstração (senha: 123456):</p>
          <div className="flex flex-wrap gap-1.5">
            {USUARIOS_DEMO.map((u) => (
              <button
                key={u.email} type="button"
                onClick={() => { setEmail(u.email); setSenha('123456'); }}
                className="text-xs bg-marca-50 dark:bg-neutral-800 text-marca-800 dark:text-marca-300 px-2.5 py-1.5 rounded-full hover:bg-marca-100 dark:hover:bg-neutral-700"
              >
                {u.papel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
