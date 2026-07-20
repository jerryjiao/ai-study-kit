import { useState } from 'react';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';

/** 同步状态横幅：仅当 syncStatus === 'error' 时显示。
 *  手机友好：吸顶红色横条，点击重试 flush pending 队列。
 *  正常状态下不渲染，不打扰刷题。 */
export function SyncStatusBanner() {
  const { syncStatus, retrySync } = useProgress();
  const [retrying, setRetrying] = useState(false);
  // 用户手动关闭后，本次会话不再显示（避免烦人）；下次失败会再次出现
  const [dismissed, setDismissed] = useState(false);

  if (syncStatus !== 'error' || dismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    await retrySync();
    setRetrying(false);
  };

  return (
    <div className="sticky top-16 z-30 bg-red-600 text-white px-4 py-2 flex items-center gap-2 text-sm shadow-md">
      <CloudOff className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="flex-1 min-w-0 truncate">
        {retrying ? '正在重试同步…' : '进度同步失败，已暂存本地。点击重试'}
      </span>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="shrink-0 flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} strokeWidth={2} />
        重试
      </button>
      {!retrying && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
          aria-label="关闭"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
