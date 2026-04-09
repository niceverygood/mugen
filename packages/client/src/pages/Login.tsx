import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useT } from '../store/langStore';
import LangSwitch from '../components/ui/LangSwitch';

export default function Login() {
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'auth.login_failed';
      // Translate server error codes
      const translated = t(msg);
      setError(translated !== msg ? translated : t('auth.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', fontFamily: '"JetBrains Mono","Fira Code",monospace' } as React.CSSProperties,
    card: { background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 40, width: 380, position: 'relative' as const } as React.CSSProperties,
    title: { color: '#2f81f7', fontSize: 28, fontWeight: 800, letterSpacing: 3, marginBottom: 4, textAlign: 'center' as const },
    sub: { color: '#30363d', fontSize: 11, textAlign: 'center' as const, marginBottom: 32 },
    label: { display: 'block', color: '#8b949e', fontSize: 11, marginBottom: 6, fontWeight: 600 } as React.CSSProperties,
    input: { width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16, fontFamily: 'inherit' },
    btn: { width: '100%', padding: '12px 0', background: 'linear-gradient(135deg,#1f4878,#0f3060)', border: '1px solid #2f81f7', borderRadius: 8, color: '#79c0ff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit' },
    err: { color: '#f85149', fontSize: 11, textAlign: 'center' as const, marginBottom: 12, background: '#2d1214', padding: '6px 10px', borderRadius: 6, border: '1px solid #f8514930' },
  };

  return (
    <div style={S.page}>
      <form style={S.card} onSubmit={handleSubmit}>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <LangSwitch />
        </div>
        <div style={S.title}>MUGEN</div>
        <div style={S.sub}>{t('app.system')}</div>

        {error && <div style={S.err}>{error}</div>}

        <label style={S.label}>{t('auth.username')}</label>
        <input style={S.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoFocus />

        <label style={S.label}>{t('auth.password')}</label>
        <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" />

        <button type="submit" style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
          {loading ? t('auth.logging_in') : t('auth.login')}
        </button>
      </form>
    </div>
  );
}
