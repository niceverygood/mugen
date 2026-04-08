import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [filter, setFilter] = useState<string>('');

  const loadProjects = async () => {
    try {
      const data = await api.getProjects(filter ? { status: filter } : undefined);
      setProjects(data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, [filter]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const project = await api.createProject({ name: newName, clientName: newClient || newName });
      setShowCreate(false);
      setNewName('');
      setNewClient('');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors: Record<string, string> = {
    IN_PROGRESS: '#e3b341',
    REVIEW: '#2f81f7',
    COMPLETED: '#3fb950',
  };
  const statusLabels: Record<string, string> = {
    IN_PROGRESS: '作業中',
    REVIEW: 'レビュー',
    COMPLETED: '完了',
  };

  const S = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: 12 } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, background: '#161b22', borderBottom: '1px solid #21262d', gap: 12 } as React.CSSProperties,
    content: { maxWidth: 960, margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
    card: { background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '16px 20px', marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.15s' } as React.CSSProperties,
    btn: (primary = false) => ({
      padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
      background: primary ? '#1f4878' : 'transparent',
      border: `1px solid ${primary ? '#2f81f7' : '#30363d'}`,
      color: primary ? '#79c0ff' : '#8b949e',
    }),
    badge: (color: string) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10,
      background: color + '20', color, border: `1px solid ${color}40`,
    }),
    input: { padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', fontSize: 12, width: '100%', boxSizing: 'border-box' as const, marginBottom: 10, fontFamily: 'inherit' },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#2f81f7', letterSpacing: 2 }}>MUGEN</span>
        <span style={{ fontSize: 10, color: '#30363d' }}>構造図面自動生成</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#8b949e' }}>{user?.name} ({user?.role})</span>
        <button onClick={() => { logout(); navigate('/login'); }} style={S.btn()}>ログアウト</button>
      </div>

      <div style={S.content}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h2 style={{ color: '#c9d1d9', fontSize: 18, fontWeight: 700, margin: 0 }}>プロジェクト</h2>
          <div style={{ flex: 1 }} />
          {['', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ ...S.btn(filter === s), fontSize: 10 }}>
              {s ? statusLabels[s] : '全て'}
            </button>
          ))}
          <button onClick={() => setShowCreate(true)} style={S.btn(true)}>+ 新規プロジェクト</button>
        </div>

        {showCreate && (
          <div style={{ ...S.card, border: '1px solid #2f81f7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#79c0ff', marginBottom: 12 }}>新規プロジェクト作成</div>
            <input style={S.input} placeholder="プロジェクト名" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            <input style={S.input} placeholder="顧客名" value={newClient} onChange={e => setNewClient(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreate} style={S.btn(true)}>作成</button>
              <button onClick={() => setShowCreate(false)} style={S.btn()}>キャンセル</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: '#30363d', textAlign: 'center', padding: 40 }}>読み込み中...</div>
        ) : projects.length === 0 ? (
          <div style={{ color: '#30363d', textAlign: 'center', padding: 40 }}>プロジェクトがありません</div>
        ) : (
          projects.map(p => (
            <div key={p.id} style={S.card} onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#c9d1d9' }}>{p.name}</span>
                <span style={S.badge(statusColors[p.status] || '#8b949e')}>{statusLabels[p.status] || p.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#8b949e' }}>
                <span>顧客: {p.clientName}</span>
                <span>図面: {p._count?.drawings || 0}枚</span>
                <span>作成者: {p.createdBy?.name}</span>
                <span>{new Date(p.updatedAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
