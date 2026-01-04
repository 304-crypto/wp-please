import React, { useState, useEffect } from 'react';
import { WordPressConfig } from '../types';
import { testWordPressConnection } from '../services/wordPressService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WordPressConfig) => void;
  initialConfig?: WordPressConfig;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<WordPressConfig>(initialConfig || {
    siteUrl: '', username: '', applicationPassword: '',
    customInstruction: '', defaultCategoryId: '',
    enableAiImage: true, aiImageCount: 1,
    adCode1: '', adCode2: '',
    defaultStatus: 'draft', publishInterval: 30,
    startTime: new Date().toISOString().slice(0, 16),
    apiKeys: [''], currentKeyIndex: 0
  });

  // API 키 텍스트 상태 (줄바꿈으로 입력)
  const [apiKeysText, setApiKeysText] = useState('');

  const [testStatus, setTestStatus] = useState<{ loading: boolean, msg: string, ok?: boolean }>({ loading: false, msg: '' });
  const [activeTab, setActiveTab] = useState<'wordpress' | 'apikeys' | 'ads'>('wordpress');

  // ═══════════════════════════════════════════════════════════
  // 초기화: config.apiKeys를 텍스트로 변환
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (initialConfig?.apiKeys && initialConfig.apiKeys.length > 0) {
      const text = initialConfig.apiKeys
        .filter(k => k.trim().length > 0)
        .join('\n');
      setApiKeysText(text);
    }
  }, [initialConfig]);

  const runTest = async () => {
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
      setTestStatus({ loading: false, msg: "모든 항목을 채워주세요.", ok: false });
      return;
    }
    setTestStatus({ loading: true, msg: '연결 확인 중...' });
    const result = await testWordPressConnection(config);
    setTestStatus({ loading: false, msg: result.message, ok: result.ok });
  };

  // ═══════════════════════════════════════════════════════════
  // 저장 버튼 클릭 시: 텍스트를 배열로 변환
  // ═══════════════════════════════════════════════════════════
  const handleSave = () => {
    // API 키 텍스트를 배열로 변환
    const apiKeys = apiKeysText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (apiKeys.length === 0) {
      alert('API 키를 최소 1개 이상 입력해주세요!');
      return;
    }

    // WordPress 연결 정보 확인
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
      alert('WordPress 연결 정보를 모두 입력해주세요!');
      setActiveTab('wordpress');
      return;
    }

    const finalConfig = {
      ...config,
      apiKeys: apiKeys,
      currentKeyIndex: 0 // 저장 시 첫 번째 키로 초기화
    };

    console.log('✅ 설정 저장:', finalConfig);
    onSave(finalConfig);
    onClose();
  };

  const validKeyCount = apiKeysText
    .split('\n')
    .filter(k => k.trim().length > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[600] p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-8 flex justify-between items-center bg-slate-50/50 border-b shrink-0">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter">⚙️ 설정</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-slate-400"><i className="fa-solid fa-xmark"></i></button>
        </div>

        {/* 탭 */}
        <div className="px-8 pt-6 flex gap-2 shrink-0">
          {[
            { id: 'wordpress', label: '워드프레스', icon: 'fa-wordpress' },
            { id: 'apikeys', label: 'API 키', icon: 'fa-key', badge: validKeyCount },
            { id: 'ads', label: '광고 코드', icon: 'fa-ad' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              <i className={`fa-brands ${tab.icon}`}></i>
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === tab.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'
                  }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          {/* 워드프레스 탭 */}
          {activeTab === 'wordpress' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 ml-1 uppercase">사이트 주소</label>
                <input type="url" placeholder="https://example.com" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner" value={config.siteUrl} onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 ml-1 uppercase">아이디</label>
                  <input type="text" placeholder="admin" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner" value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 ml-1 uppercase">앱 비밀번호</label>
                  <input type="password" placeholder="16자리 비밀번호" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner" value={config.applicationPassword} onChange={(e) => setConfig({ ...config, applicationPassword: e.target.value })} />
                </div>
              </div>

              <button type="button" onClick={runTest} className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                {testStatus.loading ? '확인하는 중...' : '🔗 연결 테스트'}
              </button>

              {testStatus.msg && (
                <div className={`p-4 rounded-xl text-xs font-bold text-center ${testStatus.ok ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                  {testStatus.msg}
                </div>
              )}
            </div>
          )}

          {/* API 키 탭 (textarea 방식) */}
          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                  <i className="fa-solid fa-lightbulb text-amber-500"></i>
                  줄바꿈으로 여러 개 입력하세요! 할당량 소진 시 자동 전환됩니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 ml-1 uppercase flex items-center justify-between">
                  <span>Gemini API 키들 (줄바꿈으로 구분)</span>
                  <span className="text-indigo-600">{validKeyCount}개 등록됨</span>
                </label>
                <textarea
                  value={apiKeysText}
                  onChange={(e) => setApiKeysText(e.target.value)}
                  placeholder="AIzaSy... (첫번째 키)
AIzaSy... (두번째 키)
AIzaSy... (세번째 키)

💡 한 줄에 하나씩 입력하세요!"
                  rows={10}
                  className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-mono text-xs outline-none focus:border-indigo-100 focus:bg-white transition-all shadow-inner resize-none"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-emerald-600">● 현재 활성:</span> 키 #{(config.currentKeyIndex || 0) + 1}
                  {validKeyCount > 0 && <span className="ml-3">| 유효한 키: {validKeyCount}개</span>}
                </p>
              </div>

              {/* 미리보기 */}
              {validKeyCount > 0 && (
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-800 mb-2">📋 입력된 키 미리보기:</p>
                  <div className="space-y-1">
                    {apiKeysText.split('\n').filter(k => k.trim().length > 0).slice(0, 5).map((key, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {idx + 1}
                        </div>
                        <code className="text-slate-600 truncate">
                          {key.substring(0, 20)}...{key.substring(key.length - 6)}
                        </code>
                      </div>
                    ))}
                    {validKeyCount > 5 && (
                      <p className="text-xs text-slate-400 ml-8">...외 {validKeyCount - 5}개</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 광고 코드 탭 */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 ml-1 uppercase">[AD1] 코드 - 서론 직후</label>
                <textarea placeholder="구글 애드센스, 쿠팡파트너스 등" className="w-full h-28 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-mono text-xs outline-none focus:bg-white transition-all shadow-inner resize-none" value={config.adCode1} onChange={(e) => setConfig({ ...config, adCode1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 ml-1 uppercase">[AD2] 코드 - 본문 중간</label>
                <textarea placeholder="구글 애드센스, 쿠팡파트너스 등" className="w-full h-28 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-mono text-xs outline-none focus:bg-white transition-all shadow-inner resize-none" value={config.adCode2} onChange={(e) => setConfig({ ...config, adCode2: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-8 bg-slate-50/50 border-t shrink-0">
          <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">
            💾 저장 후 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
