
import React, { useState, useEffect, useCallback } from 'react';
import { AppStatus, WordPressConfig, GeneratedPost, BulkItem, DashboardStats } from './types';
import { generateSEOContent } from './services/geminiService';
import { publishToWordPress, fetchPostStats, fetchScheduledPosts } from './services/wordPressService';
import SettingsModal from './components/SettingsModal';
import PreviewModal from './components/PreviewModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'writer' | 'manager'>('writer');
  const [bulkInput, setBulkInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [queue, setQueue] = useState<BulkItem[]>([]);
  const [wpConfig, setWpConfig] = useState<WordPressConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<GeneratedPost | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<GeneratedPost[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ unprocessed: 0, localPending: 0, wpDraft: 0, wpFuture: 0, wpPublish: 0 });
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 스케줄링 설정 (한국표준시 기반)
  const getKSTDate = () => {
    const now = new Date();
    const kstOffset = 9 * 60;
    const utcOffset = now.getTimezoneOffset();
    const kstTime = new Date(now.getTime() + (utcOffset + kstOffset) * 60000);
    return kstTime.toISOString().slice(0, 16);
  };

  const [scheduleConfig, setScheduleConfig] = useState({
    status: 'draft' as 'draft' | 'publish' | 'future',
    startTime: getKSTDate(),
    interval: 30
  });

  // 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wp_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWpConfig(parsed);
        refreshStats(parsed);
      }
    } catch (e) {
      console.error('설정 불러오기 실패:', e);
    }
  }, []);

  // 통계 새로고침
  const refreshStats = useCallback(async (config: WordPressConfig) => {
    if (!config?.siteUrl) return;
    try {
      const wp = await fetchPostStats(config);
      setStats(prev => ({ ...prev, ...wp }));
    } catch (e) {
      console.error('통계 불러오기 실패:', e);
    }
  }, []);

  // 설정 저장
  const saveConfig = useCallback((config: WordPressConfig) => {
    setWpConfig(config);
    try {
      localStorage.setItem('wp_config', JSON.stringify(config));
    } catch (e) {
      console.error('설정 저장 실패:', e);
    }
    refreshStats(config);
  }, [refreshStats]);

  // API 키 인덱스 업데이트 (로테이션 시)
  const handleKeyIndexChange = useCallback((newIndex: number) => {
    if (wpConfig) {
      const updated = { ...wpConfig, currentKeyIndex: newIndex };
      setWpConfig(updated);
      try {
        localStorage.setItem('wp_config', JSON.stringify(updated));
      } catch (e) {
        console.error('키 인덱스 저장 실패:', e);
      }
    }
  }, [wpConfig]);

  // 단일 항목 처리
  const processQueueItem = async (index: number, config: WordPressConfig, items: BulkItem[]) => {
    setQueue(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'generating', error: undefined } : it));

    try {
      // 콘텐츠 생성
      const post = await generateSEOContent(items[index].topic, config, handleKeyIndexChange);
      post.status = scheduleConfig.status;
      post.date = items[index].scheduledDate;

      // 발행 상태 업데이트
      setQueue(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'publishing', result: post } : it));

      // WordPress 발행
      const wpResult = await publishToWordPress(config, post);
      post.id = wpResult.id;

      // 완료
      setQueue(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'completed', result: post } : it));
      refreshStats(config);

    } catch (e: any) {
      // 에러 발생 시에도 생성된 콘텐츠는 미리보기 가능하도록 보존
      setQueue(prev => prev.map((it, idx) => {
        if (idx === index) {
          return {
            ...it,
            status: 'failed',
            error: e.message || '알 수 없는 오류가 발생했습니다.',
            // 이미 생성된 result가 있으면 보존
            result: it.result
          };
        }
        return it;
      }));
    }
  };

  // 배치 시작
  const startBatch = async () => {
    setGlobalError(null);

    // 설정 확인
    if (!wpConfig) {
      setIsSettingsOpen(true);
      return;
    }

    // API 키 확인
    const hasApiKeys = wpConfig.apiKeys && wpConfig.apiKeys.some(k => k.trim().length > 0);
    if (!hasApiKeys) {
      setGlobalError('API 키가 설정되지 않았습니다. 설정 → API 키 탭에서 최소 1개 이상의 키를 입력해주세요.');
      setIsSettingsOpen(true);
      return;
    }

    // WordPress 연결 확인
    if (!wpConfig.siteUrl || !wpConfig.username || !wpConfig.applicationPassword) {
      setGlobalError('WordPress 연결 정보가 불완전합니다. 설정에서 확인해주세요.');
      setIsSettingsOpen(true);
      return;
    }

    // 주제 파싱
    const lines = bulkInput.split('\n').filter(l => l.includes('///'));
    if (lines.length === 0) {
      setGlobalError('발행할 주제가 없습니다. "제목///키워드" 형식으로 입력해주세요.');
      return;
    }

    // 스케줄 계산
    let currentSchedule = new Date(scheduleConfig.startTime);
    if (isNaN(currentSchedule.getTime())) {
      currentSchedule = new Date();
    }

    const items: BulkItem[] = lines.map((topic, i) => ({
      topic,
      status: 'pending',
      scheduledDate: new Date(currentSchedule.getTime() + (i * scheduleConfig.interval * 60000)).toISOString()
    }));

    setQueue(items);
    setStatus(AppStatus.PROCESSING);

    // 순차 처리
    for (let i = 0; i < items.length; i++) {
      await processQueueItem(i, wpConfig, items);
    }

    setStatus(AppStatus.IDLE);
  };

  // 재시도
  const retryItem = async (index: number) => {
    if (!wpConfig) return;
    await processQueueItem(index, wpConfig, queue);
  };

  // 발행 관리 탭 데이터 로드
  const loadPublishedPosts = async () => {
    if (!wpConfig) return;
    try {
      const posts = await fetchScheduledPosts(wpConfig);
      setPublishedPosts(posts);
    } catch (e: any) {
      console.error('포스트 목록 불러오기 실패:', e);
    }
  };

  const inputTopicCount = bulkInput.split('\n').filter(l => l.includes('///')).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-['NanumSquareNeo']">
      <header className="bg-white border-b sticky top-0 z-50 h-20 flex items-center px-8 shadow-sm">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3"><i className="fa-solid fa-rocket text-xl"></i></div>
            <h1 className="font-black text-2xl tracking-tighter uppercase">Gem SEO <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('writer')} className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'writer' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>자동 집필</button>
            <button onClick={() => { setActiveTab('manager'); loadPublishedPosts(); }} className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'manager' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>발행 관리</button>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-slate-400 hover:text-indigo-600 bg-white transition-all shadow-sm"><i className="fa-solid fa-gear text-xl"></i></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 pt-12">
        {/* 글로벌 에러 알림 */}
        {globalError && (
          <div className="mb-8 bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shrink-0">
              <i className="fa-solid fa-exclamation-triangle"></i>
            </div>
            <div className="flex-1">
              <p className="font-bold text-rose-800 mb-1">오류 발생</p>
              <p className="text-sm text-rose-600">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-rose-400 hover:text-rose-600">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        )}

        {activeTab === 'writer' ? (
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {/* 포스팅 주제 입력 */}
              <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <div className={`px-8 py-4 rounded-3xl font-black text-2xl transition-all shadow-inner ${inputTopicCount > 0 ? 'bg-indigo-600 text-white animate-bounce' : 'bg-slate-100 text-slate-300'}`}>{inputTopicCount}</div>
                </div>
                <h2 className="text-2xl font-black mb-8 flex items-center gap-4 text-slate-800"><i className="fa-solid fa-pen-nib text-indigo-600"></i> 포스팅 주제 입력</h2>
                <textarea
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  placeholder={"제목///핵심키워드\n예시: 2024 최신 노트북 추천///노트북 추천\n\n여러 줄 입력 시 순차적으로 발행됩니다"}
                  className="w-full h-80 p-10 bg-slate-50 border-2 border-transparent rounded-[2.5rem] outline-none text-lg font-bold resize-none mb-8 focus:bg-white focus:border-indigo-100 transition-all shadow-inner"
                />
              </div>

              {/* 📅 예약 발행 설정 패널 */}
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
                <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-slate-800">
                  <i className="fa-solid fa-calendar-check text-indigo-600"></i>
                  예약 발행 설정
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">한국표준시 (KST)</span>
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* 시작 시간 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-regular fa-clock text-indigo-400"></i>
                      시작 시간
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleConfig.startTime}
                      onChange={e => setScheduleConfig(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  {/* 발행 상태 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-toggle-on text-indigo-400"></i>
                      발행 상태
                    </label>
                    <select
                      value={scheduleConfig.status}
                      onChange={e => setScheduleConfig(prev => ({ ...prev, status: e.target.value as 'draft' | 'publish' | 'future' }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="draft">📝 임시저장</option>
                      <option value="publish">🚀 즉시발행</option>
                      <option value="future">⏰ 예약발행</option>
                    </select>
                  </div>

                  {/* 발행 간격 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-stopwatch text-indigo-400"></i>
                      발행 간격
                    </label>
                    <select
                      value={scheduleConfig.interval}
                      onChange={e => setScheduleConfig(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-bold text-sm focus:border-indigo-100 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value={10}>10분 간격</option>
                      <option value={20}>20분 간격</option>
                      <option value={30}>30분 간격</option>
                      <option value={60}>60분 간격</option>
                      <option value={120}>2시간 간격</option>
                      <option value={360}>6시간 간격</option>
                      <option value={1440}>24시간 간격</option>
                    </select>
                  </div>
                </div>

                {/* 예약 미리보기 */}
                {inputTopicCount > 0 && scheduleConfig.status === 'future' && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 mb-3 uppercase tracking-widest">📅 예약 미리보기</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: Math.min(inputTopicCount, 5) }).map((_, i) => {
                        const time = new Date(new Date(scheduleConfig.startTime).getTime() + i * scheduleConfig.interval * 60000);
                        return (
                          <span key={i} className="px-4 py-2 bg-white rounded-full text-xs font-bold text-slate-600 shadow-sm border">
                            #{i + 1} → {time.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        );
                      })}
                      {inputTopicCount > 5 && <span className="px-4 py-2 text-xs font-bold text-slate-400">...외 {inputTopicCount - 5}개</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* 발행 시작 버튼 */}
              <button
                onClick={startBatch}
                disabled={status === AppStatus.PROCESSING || inputTopicCount === 0}
                className="w-full py-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_25px_60px_rgba(79,70,229,0.4)] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-4">
                  {status === AppStatus.PROCESSING ? (
                    <>
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      발행 진행 중...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-rocket text-2xl group-hover:animate-bounce"></i>
                      광고 자동 삽입 및 발행 시작
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>

              {/* 작업 큐 */}
              <div className="grid gap-6">
                {queue.map((item, idx) => (
                  <div key={idx} className={`bg-white p-8 rounded-[3rem] border-2 flex flex-col gap-6 shadow-sm hover:shadow-2xl transition-all animate-in slide-in-from-bottom-4 ${item.status === 'failed' ? 'border-rose-200 bg-rose-50/10' : 'border-slate-50'}`}>
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
                        {item.result?.featuredMediaUrl ? <img src={item.result.featuredMediaUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-indigo-200">{item.status === 'generating' || item.status === 'publishing' ? <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <i className="fa-solid fa-hourglass-start text-3xl"></i>}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 text-xl truncate mb-3">{item.topic.split('///')[0]}</h4>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`inline-flex items-center px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest leading-none ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'failed' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-indigo-100 text-indigo-700 animate-pulse'}`}>
                            {item.status === 'pending' && '대기중'}
                            {item.status === 'generating' && '생성중'}
                            {item.status === 'publishing' && '발행중'}
                            {item.status === 'completed' && '완료'}
                            {item.status === 'failed' && '실패'}
                          </span>
                          {item.scheduledDate && (
                            <span className="text-xs text-slate-400 font-bold">
                              <i className="fa-regular fa-clock mr-1"></i>
                              {new Date(item.scheduledDate).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {item.status === 'failed' && <button onClick={() => retryItem(idx)} className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-rose-600 active:scale-90 transition-all"><i className="fa-solid fa-rotate-right text-xl"></i></button>}
                        {item.result && <button onClick={() => setPreviewPost(item.result!)} className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-black transition-all"><i className="fa-solid fa-eye"></i></button>}
                      </div>
                    </div>
                    {item.status === 'failed' && item.error && (
                      <div className="bg-white p-8 rounded-[2.2rem] border-2 border-rose-100 shadow-sm">
                        <p className="text-[11px] font-black text-rose-800 uppercase mb-4 flex items-center gap-2 tracking-widest"><i className="fa-solid fa-circle-exclamation text-lg"></i> 에러 상세</p>
                        <p className="text-[13px] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border-l-8 border-rose-500">
                          {item.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <aside className="lg:col-span-4 space-y-8">
              {/* API 키 상태 표시 */}
              {wpConfig?.apiKeys && wpConfig.apiKeys.filter(k => k.trim()).length > 0 && (
                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-key"></i> API 키 상태
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black">
                      {(wpConfig.currentKeyIndex || 0) + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">현재 활성 키: #{(wpConfig.currentKeyIndex || 0) + 1}</p>
                      <p className="text-xs text-slate-400">총 {wpConfig.apiKeys.filter(k => k.trim()).length}개 등록됨</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 통계 */}
              <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-3xl sticky top-28 border border-white/5">
                <h3 className="text-xs font-black text-slate-500 uppercase mb-8 tracking-widest flex items-center gap-2"><i className="fa-solid fa-chart-line"></i> 실시간 통합 통계</h3>
                <div className="grid gap-6">
                  {[{ label: '발행 성공', val: stats.wpPublish, color: 'text-emerald-400', icon: 'fa-check' }, { label: '예약 완료', val: stats.wpFuture, color: 'text-indigo-400', icon: 'fa-clock' }, { label: '임시 저장', val: stats.wpDraft, color: 'text-amber-400', icon: 'fa-file-lines' }].map((s, i) => (
                    <div key={i} className="bg-slate-800/40 p-6 rounded-[2.2rem] flex items-center justify-between border border-white/5 hover:bg-slate-800/60 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ${s.color}`}><i className={`fa-solid ${s.icon}`}></i></div>
                        <span className="text-xs font-black text-slate-300">{s.label}</span>
                      </div>
                      <span className={`text-4xl font-black ${s.color}`}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6">
            {publishedPosts.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-16 text-center">
                <i className="fa-solid fa-inbox text-6xl text-slate-200 mb-6"></i>
                <p className="text-slate-400 font-bold">발행된 글이 없습니다</p>
              </div>
            ) : (
              publishedPosts.map(post => (
                <div key={post.id} className="bg-white p-8 rounded-[3.5rem] border-2 border-slate-50 flex items-center gap-10 shadow-sm hover:shadow-2xl transition-all cursor-pointer" onClick={() => setPreviewPost(post)}>
                  <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] overflow-hidden shadow-inner">{post.featuredMediaUrl && <img src={post.featuredMediaUrl} className="w-full h-full object-cover" alt="" />}</div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-2xl mb-3 truncate">{post.title}</h4>
                    <span className={`text-[11px] font-black px-6 py-2 rounded-full uppercase tracking-tighter shadow-sm ${post.status === 'publish' ? 'bg-emerald-100 text-emerald-600' :
                        post.status === 'future' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-amber-100 text-amber-600'
                      }`}>{post.status === 'publish' ? '발행됨' : post.status === 'future' ? '예약됨' : '임시저장'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={saveConfig}
        initialConfig={wpConfig || undefined}
      />

      <PreviewModal
        isOpen={!!previewPost}
        post={previewPost}
        onClose={() => setPreviewPost(null)}
      />
    </div>
  );
};

export default App;
