import { useState } from 'react';
import { CloudOff, Info, RefreshCw, X } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { useI18n } from '../i18n';

/** 同步状态横幅：
 *  - 'error'：吸顶红色横条，点击重试 flush pending 队列。
 *  - 'local'：本地模式（在线演示/无后端）——蓝色信息条，说明进度仅存本浏览器，无重试。
 *    关闭一次即永久关闭（localStorage 记忆）——常用者/本地学习者不该每次都被提示。
 *  正常状态下不渲染，不打扰刷题。 */
const LOCAL_DISMISS_KEY = 'ask-banner-local-dismissed';

export function SyncStatusBanner() {
  const { syncStatus, retrySync } = useProgress();
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);
  // local 横幅：localStorage 持久化（v1 是会话级 dismissed，会被每次刷新打扰）；
  // error 横幅独立会话级——同步出错每次都该看到，能点重试，不受 local 关闭影响。
  const [localDismissed, setLocalDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_DISMISS_KEY) === '1'
  );
  const [errorDismissed, setErrorDismissed] = useState(false);
  const dismissLocal = () => {
    setLocalDismissed(true);
    try { localStorage.setItem(LOCAL_DISMISS_KEY, '1'); } catch { /* 隐私模式等写入失败可忽略 */ }
  };

  // 本地模式：友好提示替代报错（demo 访客不该看到"同步失败"误以为有 bug）
  if (syncStatus === 'local' && !localDismissed) {
    return (
      <div className="sticky top-16 z-30 bg-sky-600 text-white px-4 py-2 flex items-center gap-2 text-sm shadow-md">
        <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1 min-w-0 truncate">{t('sync.local')}</span>
        <button
          onClick={dismissLocal}
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
          aria-label={t('sync.close')}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (syncStatus !== 'error' || errorDismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    await retrySync();
    setRetrying(false);
  };

  return (
    <div className="sticky top-16 z-30 bg-red-600 text-white px-4 py-2 flex items-center gap-2 text-sm shadow-md">
      <CloudOff className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="flex-1 min-w-0 truncate">
        {retrying ? t('sync.retrying') : t('sync.error')}
      </span>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="shrink-0 flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} strokeWidth={2} />
        {t('sync.retry')}
      </button>
      {!retrying && (
        <button
          onClick={() => setErrorDismissed(true)}
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
          aria-label={t('sync.close')}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
