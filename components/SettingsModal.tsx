
import React, { useState } from 'react';
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

  const [testStatus, setTestStatus] = useState<{ loading: boolean, msg: string, ok?: boolean }>({ loading: false, msg: '' });
  const [activeTab, setActiveTab] = useState<'wordpress' | 'apikeys' | 'ads'>('wordpress');

  const runTest = async () => {
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
      setTestStatus({ loading: false, msg: "모든 항목을 채워주세요.", ok: false });
      return;
    }
    setTestStatus({ loading: true, msg: '연결 확인 중...' });
    const result = await testWordPressConnection(config);
    setTestStatus({ loading: false, msg: result.message, ok: result.ok });
  };

  // API 키 관리
  const apiKeys = config.apiKeys || [''];

  const addApiKey = () => {
    if (apiKeys.length < 10) {
      setConfig({ ...config, apiKeys: [...apiKeys, ''] });
    }
  };

  const removeApiKey = (index: number) => {
    if (apiKeys.length > 1) {
      const newKeys = apiKeys.filter((_, i) => i !== index);
      setConfig({
        ...config,
        apiKeys: newKeys,
        currentKeyIndex: Math.min(config.currentKeyIndex || 0, newKeys.length - 1)
      });
    }
  };

  const updateApiKey = (index: number, value: string) => {
    const newKeys = [...apiKeys];
    newKeys[index] = value;
    setConfig({ ...config, apiKeys: newKeys });
  };

  const validKeyCount = apiKeys.filter(k => k.trim().length > 0).length;

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

          {/* API 키 탭 */}
          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                  <i className="fa-solid fa-lightbulb text-amber-500"></i>
                  할당량 소진 시 자동으로 다음 키로 전환됩니다 (최대 10개)
                </p>
              </div>

              <div className="space-y-3">
                {apiKeys.map((key, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${index === (config.currentKeyIndex || 0) && key.trim()
                        ? 'bg-emerald-500 text-white'
                        : key.trim() ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-300'
                      }`}>
                      {index + 1}
                    </div>
                    <input
                      type="password"
                      placeholder={`API 키 #${index + 1}`}
                      className="flex-1 px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl outline-none font-mono text-sm focus:border-indigo-100 focus:bg-white transition-all"
                      value={key}
                      onChange={(e) => updateApiKey(index, e.target.value)}
                    />
                    {apiKeys.length > 1 && (
                      <button
                        onClick={() => removeApiKey(index)}
                        className="w-10 h-10 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-200 transition-all"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {apiKeys.length < 10 && (
                <button
                  onClick={addApiKey}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i>
                  API 키 추가 ({apiKeys.length}/10)
                </button>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-emerald-600">● 현재 활성:</span> 키 #{(config.currentKeyIndex || 0) + 1}
                  {validKeyCount > 0 && <span className="ml-3">| 유효한 키: {validKeyCount}개</span>}
                </p>
              </div>
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
          <button onClick={() => { onSave(config); onClose(); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">
            💾 저장 후 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
