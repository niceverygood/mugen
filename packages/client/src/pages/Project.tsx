import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Project() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getProject(parseInt(id!));
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await api.uploadDrawing(parseInt(id!), file);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const typeLabels: Record<string, string> = {
    ARCHITECTURAL: '意匠図面',
    STRUCTURAL: '構造図面',
    MANUAL: '手動作成',
  };
  const typeColors: Record<string, string> = {
    ARCHITECTURAL: '#2f81f7',
    STRUCTURAL: '#3fb950',
    MANUAL: '#e3b341',
  };

  const S = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: 12 } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, background: '#161b22', borderBottom: '1px solid #21262d', gap: 12 } as React.CSSProperties,
    content: { maxWidth: 960, margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
    card: { background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '16px 20px', marginBottom: 10 } as React.CSSProperties,
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
  };

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>読み込み中...</div>;
  if (!project) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>プロジェクトが見つかりません</div>;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={() => navigate('/')} style={{ ...S.btn(), padding: '4px 10px' }}>← 戻る</button>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#2f81f7', letterSpacing: 2 }}>MUGEN</span>
        <div style={{ width: 1, height: 22, background: '#21262d' }} />
        <span style={{ color: '#c9d1d9', fontWeight: 700 }}>{project.name}</span>
      </div>

      <div style={S.content}>
        {/* Project Info */}
        <div style={S.card}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>顧客名</div>
              <div style={{ fontWeight: 700 }}>{project.clientName}</div>
            </div>
            <div>
              <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>階数</div>
              <div style={{ fontWeight: 700 }}>{project.floors}階</div>
            </div>
            <div>
              <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>屋根タイプ</div>
              <div style={{ fontWeight: 700 }}>{project.roofType === 'gabled' ? '切妻' : '寄棟'}</div>
            </div>
            <div>
              <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>プリセット</div>
              <div style={{ fontWeight: 700 }}>{project.preset?.name || '未設定'}</div>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div style={{ ...S.card, border: '1px dashed #30363d', textAlign: 'center', padding: 24 }}>
          <label style={{ cursor: 'pointer', color: '#79c0ff' }}>
            DXFファイルをアップロード
            <input type="file" accept=".dxf,.DXF" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          <div style={{ color: '#30363d', fontSize: 10, marginTop: 4 }}>意匠図面 (.dxf) を選択してください</div>
        </div>

        {/* Drawings List */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>図面一覧</h3>
          {project.drawings?.length === 0 ? (
            <div style={{ color: '#30363d', textAlign: 'center', padding: 20 }}>図面がまだありません</div>
          ) : (
            project.drawings?.map((d: any) => (
              <div key={d.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={S.badge(typeColors[d.type] || '#8b949e')}>{typeLabels[d.type] || d.type}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{d.fileName}</span>
                <span style={{ color: '#30363d', fontSize: 10 }}>v{d.version}</span>
                <span style={{ color: '#30363d', fontSize: 10 }}>{new Date(d.createdAt).toLocaleString('ja-JP')}</span>

                {d.type === 'ARCHITECTURAL' && (
                  <button
                    onClick={() => navigate(`/projects/${project.id}/editor/${d.id}`)}
                    style={S.btn(true)}
                  >
                    エディタで開く
                  </button>
                )}

                <button
                  onClick={() => {
                    const url = api.getDrawingDownloadUrl(project.id, d.id);
                    const token = localStorage.getItem('accessToken');
                    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.blob())
                      .then(b => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(b);
                        a.download = d.fileName;
                        a.click();
                      });
                  }}
                  style={S.btn()}
                >
                  ダウンロード
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
