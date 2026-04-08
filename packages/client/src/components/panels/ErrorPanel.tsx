import { useEditorStore } from '../../store/editorStore';

export default function ErrorPanel() {
  const { manualErrors } = useEditorStore();

  if (manualErrors.length === 0) {
    return <div style={{ color: '#30363d', fontSize: 11, padding: '8px 2px' }}>エラーなし</div>;
  }

  return (
    <>
      {manualErrors.map((err, i) => (
        <div key={i} style={{
          padding: '6px 8px', borderRadius: 5, marginBottom: 3,
          background: err.level === 'error' ? '#2d1214' : '#1f1a0a',
          border: `1px solid ${err.level === 'error' ? '#f8514930' : '#4a3b0a'}`,
        }}>
          <span style={{ color: err.level === 'error' ? '#f85149' : '#e3b341', fontSize: 11 }}>
            {err.level === 'error' ? '\u274c' : '\u26a0'} {err.msg}
          </span>
        </div>
      ))}
    </>
  );
}
