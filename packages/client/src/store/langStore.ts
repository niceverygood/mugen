import { create } from 'zustand';

export type Lang = 'ko' | 'ja';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: (localStorage.getItem('mugen-lang') as Lang) || 'ja',
  setLang: (lang: Lang) => {
    localStorage.setItem('mugen-lang', lang);
    set({ lang });
  },
}));

// Translation dictionary
const T: Record<string, Record<Lang, string>> = {
  // Common
  'app.subtitle': { ko: '구조도면 자동생성', ja: '構造図面自動生成' },
  'app.system': { ko: '구조도면 자동생성 시스템', ja: '構造図面自動生成システム' },
  'common.loading': { ko: '로딩 중...', ja: '読み込み中...' },
  'common.cancel': { ko: '취소', ja: 'キャンセル' },
  'common.create': { ko: '생성', ja: '作成' },
  'common.back': { ko: '← 뒤로', ja: '← 戻る' },
  'common.download': { ko: '다운로드', ja: 'ダウンロード' },
  'common.all': { ko: '전체', ja: '全て' },

  // Auth
  'auth.username': { ko: '사용자명', ja: 'ユーザー名' },
  'auth.password': { ko: '비밀번호', ja: 'パスワード' },
  'auth.login': { ko: '로그인', ja: 'ログイン' },
  'auth.logging_in': { ko: '로그인 중...', ja: 'ログイン中...' },
  'auth.logout': { ko: '로그아웃', ja: 'ログアウト' },
  'auth.login_failed': { ko: '로그인에 실패했습니다', ja: 'ログインに失敗しました' },
  'CREDENTIALS_REQUIRED': { ko: '사용자명과 비밀번호를 입력하세요', ja: 'ユーザー名とパスワードが必要です' },
  'INVALID_CREDENTIALS': { ko: '사용자명 또는 비밀번호가 올바르지 않습니다', ja: 'ユーザー名またはパスワードが正しくありません' },

  // Dashboard
  'dashboard.projects': { ko: '프로젝트', ja: 'プロジェクト' },
  'dashboard.new_project': { ko: '+ 새 프로젝트', ja: '+ 新規プロジェクト' },
  'dashboard.no_projects': { ko: '프로젝트가 없습니다', ja: 'プロジェクトがありません' },
  'dashboard.create_title': { ko: '새 프로젝트 생성', ja: '新規プロジェクト作成' },
  'dashboard.project_name': { ko: '프로젝트명', ja: 'プロジェクト名' },
  'dashboard.client_name': { ko: '고객명', ja: '顧客名' },

  // Status
  'status.in_progress': { ko: '작업 중', ja: '作業中' },
  'status.review': { ko: '리뷰', ja: 'レビュー' },
  'status.completed': { ko: '완료', ja: '完了' },

  // Project
  'project.client': { ko: '고객명', ja: '顧客名' },
  'project.floors': { ko: '층수', ja: '階数' },
  'project.roof_type': { ko: '지붕 타입', ja: '屋根タイプ' },
  'project.preset': { ko: '프리셋', ja: 'プリセット' },
  'project.not_set': { ko: '미설정', ja: '未設定' },
  'project.upload_dxf': { ko: 'DXF 파일 업로드', ja: 'DXFファイルをアップロード' },
  'project.upload_hint': { ko: '의장도면 (.dxf)을 선택하세요', ja: '意匠図面 (.dxf) を選択してください' },
  'project.drawings': { ko: '도면 목록', ja: '図面一覧' },
  'project.no_drawings': { ko: '도면이 없습니다', ja: '図面がまだありません' },
  'project.open_editor': { ko: '에디터에서 열기', ja: 'エディタで開く' },
  'project.drawings_count': { ko: '도면', ja: '図面' },
  'project.creator': { ko: '작성자', ja: '作成者' },
  'project.roof_gabled': { ko: '맞배지붕', ja: '切妻' },
  'project.roof_hip': { ko: '우진각지붕', ja: '寄棟' },

  // Drawing types
  'drawing.architectural': { ko: '의장도면', ja: '意匠図面' },
  'drawing.structural': { ko: '구조도면', ja: '構造図面' },
  'drawing.manual': { ko: '수동 작성', ja: '手動作成' },

  // Editor
  'editor.tool_pan': { ko: '이동', ja: '移動' },
  'editor.tool_wall': { ko: '벽체', ja: '壁体' },
  'editor.open_dxf': { ko: 'DXF 열기', ja: 'DXF開く' },
  'editor.export_dxf': { ko: 'DXF 내보내기', ja: 'DXFエクスポート' },
  'editor.gen_complete': { ko: '생성완료', ja: '生成完了' },
  'editor.entities': { ko: '개 엔티티', ja: '個エンティティ' },

  // Tabs
  'tab.generate': { ko: '자동생성', ja: '自動生成' },
  'tab.layers': { ko: '레이어', ja: 'レイヤー' },
  'tab.presets': { ko: '프리셋', ja: 'プリセット' },
  'tab.errors': { ko: '에러', ja: 'エラー' },

  // Generate Panel
  'gen.settings': { ko: '설정', ja: '設定' },
  'gen.select_preset': { ko: '먼저 아래 프리셋을 선택하세요', ja: 'まず下のプリセットを選択してください' },
  'gen.floors': { ko: '층수', ja: '階数' },
  'gen.floor_1': { ko: '1층', ja: '1階' },
  'gen.floor_2': { ko: '2층', ja: '2階' },
  'gen.roof_type': { ko: '지붕 타입', ja: '屋根タイプ' },
  'gen.roof_gabled': { ko: '맞배지붕', ja: '切妻' },
  'gen.roof_hip': { ko: '우진각지붕', ja: '寄棟' },
  'gen.generate': { ko: '구조도면 자동생성', ja: '構造図面自動生成' },
  'gen.generating': { ko: '생성 중...', ja: '生成中...' },
  'gen.layers_title': { ko: '생성된 도면 레이어', ja: '生成された図面レイヤー' },
  'gen.show_all': { ko: '전체표시', ja: '全表示' },
  'gen.hide_all': { ko: '전체숨김', ja: '全非表示' },

  // Layer Panel
  'layer.after_upload': { ko: 'DXF 업로드 후 표시됩니다', ja: 'DXFアップロード後に表示されます' },
  'layer.show_all': { ko: '전체', ja: '全表示' },
  'layer.hide_all': { ko: '숨김', ja: '全非表示' },

  // Preset
  'preset.applied': { ko: '적용', ja: '適用' },
  'preset.stud': { ko: '스터드', ja: 'スタッド' },
  'preset.method': { ko: '공법', ja: '工法' },

  // Right Panel
  'right.legend': { ko: '도면 범례', ja: '図面凡例' },
  'right.after_gen': { ko: '자동생성 후 표시됩니다', ja: '自動生成後に表示されます' },
  'right.stats': { ko: '생성 통계', ja: '生成統計' },
  'right.total_entities': { ko: '총 엔티티', ja: '総エンティティ' },
  'right.workflow': { ko: '작업 흐름', ja: '作業フロー' },
  'right.step1': { ko: '① DXF 업로드', ja: '① DXFアップロード' },
  'right.step2': { ko: '② 프리셋 선택', ja: '② プリセット選択' },
  'right.step3': { ko: '③ 구조도면 자동생성', ja: '③ 構造図面自動生成' },
  'right.step4': { ko: '④ 검토 / 수정', ja: '④ 検討 / 修正' },
  'right.step5': { ko: '⑤ DXF 내보내기 → JW CAD', ja: '⑤ DXFエクスポート → JW CAD' },

  // Canvas
  'canvas.upload_prompt': { ko: 'DXF 파일을 업로드하세요', ja: 'DXFファイルをアップロードしてください' },
  'canvas.gen_hint': { ko: '의장도면 DXF를 업로드하면\n구조도면을 자동 생성합니다', ja: '意匠図面DXFをアップロードすると\n構造図面を自動生成します' },
  'canvas.preset_hint': { ko: '왼쪽에서 프리셋 선택 → "자동생성" 클릭', ja: '左パネルでプリセット選択 → "自動生成" をクリック' },
  'canvas.highlight': { ko: '강조표시', ja: '強調表示' },

  // Shortcuts
  'right.shortcuts': { ko: '⌘Z 실행취소 · ESC 취소\n우클릭 → 작도 취소', ja: '⌘Z 元に戻す · ESC キャンセル\n右クリック → 作図取消' },

  // Error
  'error.no_errors': { ko: '에러 없음', ja: 'エラーなし' },

  // Server Error Codes
  'SERVER_ERROR': { ko: '서버 오류가 발생했습니다', ja: 'サーバーエラー' },
  'PROJECT_NOT_FOUND': { ko: '프로젝트를 찾을 수 없습니다', ja: 'プロジェクトが見つかりません' },
  'PERMISSION_DENIED': { ko: '권한이 없습니다', ja: '権限がありません' },
  'DRAWING_NOT_FOUND': { ko: '도면을 찾을 수 없습니다', ja: '図面が見つかりません' },
  'FILE_NOT_FOUND': { ko: '파일을 찾을 수 없습니다', ja: 'ファイルが見つかりません' },
  'DXF_FILE_REQUIRED': { ko: 'DXF 파일이 필요합니다', ja: 'DXFファイルが必要です' },
  'DXF_ONLY': { ko: 'DXF 파일만 업로드 가능합니다', ja: 'DXFファイルのみアップロード可能です' },
  'INVALID_TOKEN': { ko: '토큰이 유효하지 않습니다', ja: 'トークンが無効です' },
  'AUTH_REQUIRED': { ko: '인증이 필요합니다', ja: '認証が必要です' },
  'REFRESH_TOKEN_REQUIRED': { ko: '리프레시 토큰이 필요합니다', ja: 'リフレッシュトークンが必要です' },
  'INVALID_REFRESH_TOKEN': { ko: '리프레시 토큰이 유효하지 않습니다', ja: 'リフレッシュトークンが無効です' },
  'USER_NOT_FOUND': { ko: '사용자를 찾을 수 없습니다', ja: 'ユーザーが見つかりません' },
  'UPLOAD_FAILED': { ko: '업로드에 실패했습니다', ja: 'アップロードに失敗しました' },
  'DOWNLOAD_FAILED': { ko: '다운로드에 실패했습니다', ja: 'ダウンロードに失敗しました' },
  'JOB_NOT_FOUND': { ko: '작업을 찾을 수 없습니다', ja: 'ジョブが見つかりません' },
  'GENERATION_RESULT_NOT_FOUND': { ko: '생성 결과를 찾을 수 없습니다', ja: '生成結果が見つかりません' },
  'PRESET_NOT_FOUND': { ko: '프리셋을 찾을 수 없습니다', ja: 'プリセットが見つかりません' },
};

export function useT() {
  const lang = useLangStore(s => s.lang);
  return (key: string) => T[key]?.[lang] || key;
}
