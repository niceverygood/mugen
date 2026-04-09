import { useLangStore, type Lang } from '../../store/langStore';

export default function LangSwitch() {
  const { lang, setLang } = useLangStore();

  const S = {
    wrap: { display: 'flex', gap: 2, background: '#21262d', borderRadius: 6, padding: 2 },
    btn: (active: boolean) => ({
      padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
      background: active ? '#2f81f7' : 'transparent',
      border: 'none',
      color: active ? '#fff' : '#8b949e',
      fontWeight: active ? 700 : 400,
    } as React.CSSProperties),
  };

  return (
    <div style={S.wrap}>
      {([['ko', '한국어'], ['ja', '日本語']] as [Lang, string][]).map(([code, label]) => (
        <button key={code} onClick={() => setLang(code)} style={S.btn(lang === code)}>
          {label}
        </button>
      ))}
    </div>
  );
}
