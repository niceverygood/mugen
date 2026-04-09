import { useEditorStore } from '../../store/editorStore';
import { useT } from '../../store/langStore';

interface Props {
  presets: any[];
}

export default function PresetPanel({ presets }: Props) {
  const t = useT();
  const { activePresetId, setActivePresetId } = useEditorStore();

  return (
    <>
      {presets.map(p => (
        <div key={p.id}
          onClick={() => setActivePresetId(activePresetId === p.id ? null : p.id)}
          style={{
            padding: '8px 10px', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
            background: activePresetId === p.id ? '#1f4878' : '#21262d',
            border: `1px solid ${activePresetId === p.id ? '#2f81f7' : '#30363d'}`,
          }}>
          <div style={{ fontWeight: 700, marginBottom: 2, color: activePresetId === p.id ? '#79c0ff' : '#c9d1d9', fontSize: 12 }}>
            {p.clientName}
          </div>
          <div style={{ fontSize: 10, color: '#8b949e' }}>{t('preset.stud')} {p.studSpacing}mm \u00b7 {p.wallType}</div>
          {p.notes && <div style={{ fontSize: 10, color: '#30363d' }}>{p.notes}</div>}
        </div>
      ))}
      {activePresetId && (() => {
        const p = presets.find((x: any) => x.id === activePresetId);
        if (!p) return null;
        return (
          <div style={{ marginTop: 4, padding: 8, background: '#0d1117', borderRadius: 6, border: '1px solid #21262d', fontSize: 11 }}>
            <div style={{ color: '#2f81f7', marginBottom: 4, fontWeight: 700 }}>{t('preset.applied')}: {p.clientName}</div>
            <div style={{ color: '#8b949e' }}>{t('preset.stud')}: <span style={{ color: '#c9d1d9' }}>{p.studSpacing}mm</span></div>
            <div style={{ color: '#8b949e' }}>{t('preset.method')}: <span style={{ color: '#c9d1d9' }}>{p.wallType}</span></div>
          </div>
        );
      })()}
    </>
  );
}
