import { useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useT } from '../../store/langStore';
import { PALETTE } from '@mugen/shared';

export default function LayerPanel() {
  const t = useT();
  const { dxfData, visibleLayers, setVisibleLayers, toggleLayer, activeLayer, setActiveLayer } = useEditorStore();

  const layerColors = useMemo(() => {
    if (!dxfData) return {};
    return Object.fromEntries(dxfData.layers.map((l, i) => [l, PALETTE[i % PALETTE.length]]));
  }, [dxfData]);

  if (!dxfData) return <div style={{ color: '#30363d', fontSize: 11, padding: '8px 2px' }}>{t('layer.after_upload')}</div>;

  return (
    <>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button onClick={() => setVisibleLayers(new Set(dxfData.layers))}
          style={{ flex: 1, padding: '3px 0', background: 'transparent', border: '1px solid #21262d', color: '#8b949e', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>{t('layer.show_all')}</button>
        <button onClick={() => setVisibleLayers(new Set())}
          style={{ flex: 1, padding: '3px 0', background: 'transparent', border: '1px solid #21262d', color: '#8b949e', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>{t('layer.hide_all')}</button>
      </div>
      {dxfData.layers.map(layer => {
        const vis = visibleLayers.has(layer);
        const isAct = activeLayer === layer;
        return (
          <div key={layer} onClick={() => setActiveLayer(isAct ? null : layer)}
            style={{
              display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 5, marginBottom: 2, cursor: 'pointer',
              background: isAct ? '#1f4878' : 'transparent', border: `1px solid ${isAct ? '#2f81f7' : 'transparent'}`,
            }}>
            <span onClick={ev => { ev.stopPropagation(); toggleLayer(layer); }}
              style={{ marginRight: 6, color: vis ? '#3fb950' : '#30363d', width: 14, flexShrink: 0 }}>
              {vis ? '\u25cf' : '\u25cb'}
            </span>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: layerColors[layer], marginRight: 6, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: isAct ? '#c9d1d9' : '#8b949e' }}>{layer}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 6, fontSize: 10, color: '#30363d' }}>
        {dxfData.layers.length} {t('tab.layers')} \u00b7 {dxfData.entities.length.toLocaleString()} entities
      </div>
    </>
  );
}
