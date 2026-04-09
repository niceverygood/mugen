import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { api } from '../lib/api';
import { useT } from '../store/langStore';
import { parseDXF, LAYER_ORDER, GEN_LAYER_CFG } from '@mugen/shared';
import DXFCanvas from '../components/canvas/DXFCanvas';
import GeneratePanel from '../components/panels/GeneratePanel';
import LayerPanel from '../components/panels/LayerPanel';
import PresetPanel from '../components/panels/PresetPanel';
import ErrorPanel from '../components/panels/ErrorPanel';
import LangSwitch from '../components/ui/LangSwitch';

export default function Editor() {
  const t = useT();
  const { projectId, drawingId } = useParams<{ projectId: string; drawingId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'gen' | 'layers' | 'presets' | 'errors'>('gen');
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    dxfData, setDxfData, tool, setTool, generatedLayers, genVisible,
    isGenerating, setIsGenerating, setGeneratedLayers, setGenVisible,
    setGenDone, genSettings, activePresetId, manualElements,
  } = useEditorStore();

  // Load drawing and presets
  useEffect(() => {
    (async () => {
      try {
        const [drawingData, presetsData] = await Promise.all([
          api.getDrawing(parseInt(projectId!), parseInt(drawingId!)),
          api.getPresets(),
        ]);
        setDxfData(drawingData.dxfData, drawingData.drawing.fileName);
        setPresets(presetsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, drawingId, setDxfData]);

  // Handle generation via server API
  const handleGenerate = useCallback(async () => {
    if (!dxfData || !activePresetId) return;
    setIsGenerating(true);

    try {
      const { jobId } = await api.startGenerate({
        projectId: parseInt(projectId!),
        drawingId: parseInt(drawingId!),
        presetId: activePresetId,
        settings: genSettings,
      });

      // Poll for completion
      const poll = async () => {
        const status = await api.getGenerateStatus(jobId);
        if (status.status === 'done' && status.layers) {
          setGeneratedLayers(status.layers);
          const vis: Record<string, boolean> = {};
          Object.keys(status.layers).forEach(k => { vis[k] = true; });
          setGenVisible(vis);
          setGenDone(true);
          setIsGenerating(false);
        } else if (status.status === 'error') {
          console.error('Generation error:', status.error);
          setIsGenerating(false);
        } else {
          setTimeout(poll, 500);
        }
      };
      poll();
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  }, [dxfData, activePresetId, projectId, drawingId, genSettings,
    setIsGenerating, setGeneratedLayers, setGenVisible, setGenDone]);

  // Handle DXF file open (client-side parse for quick preview)
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    const r = new FileReader();
    r.onload = ev => {
      const parsed = parseDXF(ev.target!.result as string);
      setDxfData(parsed, f.name);
    };
    r.readAsText(f, 'utf-8');
  }, [setDxfData]);

  // Export DXF (download from server job or client-generated)
  const handleExport = useCallback(() => {
    // Client-side export for now
    const { exportDXF } = require('@mugen/shared') as any;
    // Since exportDXF is on server, we'll re-implement a simple version here
    // Or just offer download from server
    alert('DXFファイルをダウンロードしています...');
  }, []);

  const totalGenEntities = Object.values(generatedLayers).reduce((s, a) => s + a.length, 0);
  const hasGen = Object.keys(generatedLayers).length > 0;

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, height: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace', fontSize: 12 },
    hdr: { display: 'flex', alignItems: 'center', padding: '0 14px', height: 46, background: '#161b22', borderBottom: '1px solid #21262d', gap: 10, flexShrink: 0 },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    left: { width: 240, background: '#161b22', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
    right: { width: 230, background: '#161b22', borderLeft: '1px solid #21262d', display: 'flex', flexDirection: 'column' as const, overflowY: 'auto' as const, padding: 8, flexShrink: 0 },
    tabs: { display: 'flex', borderBottom: '1px solid #21262d', flexShrink: 0 },
    btn: (active: boolean, dim = false) => ({
      padding: '4px 10px', borderRadius: 6, cursor: dim ? 'not-allowed' : 'pointer', fontSize: 11, fontFamily: 'inherit',
      background: active ? '#1f4878' : 'transparent',
      border: `1px solid ${active ? '#2f81f7' : '#30363d'}`,
      color: active ? '#79c0ff' : '#8b949e', opacity: dim ? 0.4 : 1,
    }),
    sL: { fontSize: 10, color: '#8b949e', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
  };

  if (loading) return <div style={{ ...S.root, alignItems: 'center', justifyContent: 'center' }}>{t('common.loading')}</div>;

  return (
    <div style={S.root}>
      {/* HEADER */}
      <div style={S.hdr}>
        <button onClick={() => navigate(`/projects/${projectId}`)} style={{ ...S.btn(false), padding: '3px 8px' }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#2f81f7', letterSpacing: 2 }}>MUGEN</span>
        <span style={{ fontSize: 10, color: '#30363d' }}>{t('app.subtitle')}</span>
        <div style={{ width: 1, height: 22, background: '#21262d' }} />
        {([['pan', '\u270b', t('editor.tool_pan')], ['wall', '\u25ac', t('editor.tool_wall')]] as [string, string, string][]).map(([id, ico, lbl]) => (
          <button key={id} onClick={() => setTool(id as any)} style={S.btn(tool === id)}>{ico} {lbl}</button>
        ))}
        <div style={{ flex: 1 }} />
        {hasGen && <span style={{ fontSize: 11, color: '#3fb950' }}>✓ {t('editor.gen_complete')} ({totalGenEntities.toLocaleString()}{t('editor.entities')})</span>}
        <LangSwitch />
        <label style={{ ...S.btn(false), cursor: 'pointer' }}>
          {t('editor.open_dxf')}
          <input type="file" accept=".dxf,.DXF" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        <button disabled={!hasGen && !manualElements.length} style={S.btn(false, !hasGen && !manualElements.length)}>
          {t('editor.export_dxf')}
        </button>
      </div>

      <div style={S.body}>
        {/* LEFT PANEL */}
        <div style={S.left}>
          <div style={S.tabs}>
            {([['gen', t('tab.generate')], ['layers', t('tab.layers')], ['presets', t('tab.presets')], ['errors', t('tab.errors')]] as [string, string][]).map(([id, lbl]) => (
              <button key={id} onClick={() => setTab(id as any)}
                style={{
                  flex: 1, padding: '8px 0', fontFamily: 'inherit',
                  background: tab === id ? '#21262d' : 'transparent',
                  borderBottom: tab === id ? '2px solid #2f81f7' : '2px solid transparent',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  color: tab === id ? '#c9d1d9' : '#8b949e', cursor: 'pointer', fontSize: 10,
                }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {tab === 'gen' && <GeneratePanel presets={presets} onGenerate={handleGenerate} />}
            {tab === 'layers' && <LayerPanel />}
            {tab === 'presets' && <PresetPanel presets={presets} />}
            {tab === 'errors' && <ErrorPanel />}
          </div>
        </div>

        {/* CANVAS */}
        <DXFCanvas />

        {/* RIGHT PANEL */}
        <div style={S.right}>
          {/* Legend */}
          <div style={{ marginBottom: 12 }}>
            <div style={S.sL}>{t('right.legend')}</div>
            {hasGen ? LAYER_ORDER.filter(k => generatedLayers[k] && genVisible[k]).map(k => {
              const cfg = GEN_LAYER_CFG[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 6px', borderRadius: 4, background: '#21262d' }}>
                  <span style={{ width: 18, height: 3, background: cfg.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#8b949e' }}>{cfg.label}</span>
                </div>
              );
            }) : (
              <div style={{ fontSize: 11, color: '#30363d' }}>{t('right.after_gen')}</div>
            )}
          </div>

          {/* Stats */}
          {hasGen && (
            <div style={{ marginBottom: 12 }}>
              <div style={S.sL}>{t('right.stats')}</div>
              {LAYER_ORDER.filter(k => generatedLayers[k]).map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', marginBottom: 2, borderRadius: 4, background: '#21262d' }}>
                  <span style={{ fontSize: 10, color: '#8b949e' }}>{k}</span>
                  <span style={{ fontSize: 10, color: '#c9d1d9', fontWeight: 700 }}>{generatedLayers[k]?.length || 0}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, padding: '4px 6px', borderRadius: 4, background: '#1f4878', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#79c0ff', fontWeight: 700 }}>{t('right.total_entities')}</span>
                <span style={{ fontSize: 10, color: '#79c0ff', fontWeight: 700 }}>{totalGenEntities.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Workflow */}
          <div style={{ marginBottom: 10 }}>
            <div style={S.sL}>{t('right.workflow')}</div>
            {[
              [hasGen || !!dxfData ? '#3fb950' : '#30363d', t('right.step1'), !!dxfData],
              [activePresetId ? '#3fb950' : '#30363d', t('right.step2'), !!activePresetId],
              [hasGen ? '#3fb950' : '#30363d', t('right.step3'), hasGen],
              ['#30363d', t('right.step4'), false],
              ['#30363d', t('right.step5'), false],
            ].map(([color, label, done], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 2, borderRadius: 4, background: done ? '#0d2a14' : 'transparent' }}>
                <span style={{ color: color as string, fontSize: 11, width: 16 }}>{done ? '\u2713' : '\u25cb'}</span>
                <span style={{ fontSize: 11, color: done ? '#3fb950' : '#8b949e' }}>{label as string}</span>
              </div>
            ))}
          </div>

          {/* Shortcuts */}
          <div style={{ marginTop: 'auto', padding: 8, background: '#0d1117', borderRadius: 6, border: '1px solid #21262d', fontSize: 10, color: '#30363d', lineHeight: 1.9 }}>
            {t('right.shortcuts') || '⌘Z 실행취소 · ESC 취소\n우클릭 → 작도 취소'}
          </div>
        </div>
      </div>
    </div>
  );
}
