import { useEditorStore } from '../../store/editorStore';
import { useT } from '../../store/langStore';
import { GEN_LAYER_CFG, LAYER_ORDER } from '@mugen/shared';

interface Props {
  presets: any[];
  onGenerate: () => void;
}

export default function GeneratePanel({ presets, onGenerate }: Props) {
  const t = useT();
  const {
    dxfData, activePresetId, setActivePresetId, genSettings, setGenSettings,
    isGenerating, genDone, generatedLayers, genVisible, setGenVisible,
    toggleGenLayer, selectedGenLayer, setSelectedGenLayer,
  } = useEditorStore();

  const S = {
    sL: { fontSize: 10, color: '#8b949e', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    btn: (active: boolean, dim = false) => ({
      padding: '4px 10px', borderRadius: 6, cursor: dim ? 'not-allowed' : 'pointer', fontSize: 11, fontFamily: 'inherit',
      background: active ? '#1f4878' : 'transparent',
      border: `1px solid ${active ? '#2f81f7' : '#30363d'}`,
      color: active ? '#79c0ff' : '#8b949e',
      opacity: dim ? 0.4 : 1,
    }),
  };

  return (
    <>
      <div style={S.sL}>{t('gen.settings')}</div>

      {!activePresetId && (
        <div style={{ background: '#1f1a0a', border: '1px solid #4a3b0a', borderRadius: 5, padding: '6px 8px', fontSize: 11, color: '#e3b341', marginBottom: 8 }}>
          {t('gen.select_preset')}
        </div>
      )}

      {/* Presets */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{t('tab.presets')}</div>
        {presets.map(p => (
          <button key={p.id}
            onClick={() => setActivePresetId(activePresetId === p.id ? null : p.id)}
            style={{ ...S.btn(activePresetId === p.id), marginRight: 4, marginBottom: 4, display: 'block', width: '100%', textAlign: 'left' }}>
            {p.clientName} ({p.wallType} {p.studSpacing}mm)
          </button>
        ))}
      </div>

      {/* Settings */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{t('gen.floors')}</div>
        {([[t('gen.floor_1'), 1], [t('gen.floor_2'), 2]] as [string, number][]).map(([lbl, val]) => (
          <button key={val} onClick={() => setGenSettings({ ...genSettings, floors: val })}
            style={{ ...S.btn(genSettings.floors === val), marginRight: 4 }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{t('gen.roof_type')}</div>
        {([[t('gen.roof_gabled'), 'gabled'], [t('gen.roof_hip'), 'hip']] as [string, string][]).map(([lbl, val]) => (
          <button key={val} onClick={() => setGenSettings({ ...genSettings, roofType: val })}
            style={{ ...S.btn(genSettings.roofType === val), marginRight: 4 }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button onClick={onGenerate}
        disabled={!dxfData || !activePresetId || isGenerating}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8, fontFamily: 'inherit',
          cursor: dxfData && activePresetId && !isGenerating ? 'pointer' : 'not-allowed',
          background: dxfData && activePresetId ? 'linear-gradient(135deg,#1f4878,#0f3060)' : '#161b22',
          border: `1px solid ${dxfData && activePresetId ? '#2f81f7' : '#21262d'}`,
          color: dxfData && activePresetId ? '#79c0ff' : '#30363d',
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
          opacity: dxfData && activePresetId ? 1 : 0.5, marginBottom: 12,
        }}>
        {isGenerating ? t('gen.generating') : t('gen.generate')}
      </button>

      {/* Generated layer toggles */}
      {genDone && (
        <>
          <div style={S.sL}>{t('gen.layers_title')}</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <button onClick={() => setGenVisible(Object.fromEntries(LAYER_ORDER.map(k => [k, true])))}
              style={{ flex: 1, padding: '3px 0', background: 'transparent', border: '1px solid #21262d', color: '#8b949e', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>{t('gen.show_all')}</button>
            <button onClick={() => setGenVisible(Object.fromEntries(LAYER_ORDER.map(k => [k, false])))}
              style={{ flex: 1, padding: '3px 0', background: 'transparent', border: '1px solid #21262d', color: '#8b949e', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>{t('gen.hide_all')}</button>
          </div>
          {LAYER_ORDER.filter(k => generatedLayers[k]).map(k => {
            const cfg = GEN_LAYER_CFG[k];
            const vis = genVisible[k];
            const cnt = generatedLayers[k]?.length || 0;
            const isSel = selectedGenLayer === k;
            return (
              <div key={k} onClick={() => setSelectedGenLayer(k)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '5px 7px', borderRadius: 5, marginBottom: 3, cursor: 'pointer',
                  background: isSel ? '#1f4878' : '#21262d', border: `1px solid ${isSel ? '#2f81f7' : 'transparent'}`,
                }}>
                <span onClick={ev => { ev.stopPropagation(); toggleGenLayer(k); }}
                  style={{ marginRight: 6, color: vis ? '#3fb950' : '#30363d', fontSize: 12, width: 14, flexShrink: 0 }}>
                  {vis ? '\u25cf' : '\u25cb'}
                </span>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: cfg.color, marginRight: 6, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ flex: 1, fontSize: 10, color: isSel ? '#c9d1d9' : '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 10, color: '#30363d' }}>{cnt}</span>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
