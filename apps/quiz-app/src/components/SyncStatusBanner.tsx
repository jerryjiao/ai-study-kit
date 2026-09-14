import { useState, type ReactNode } from 'react';
import { AlertTriangle, CloudOff, Info, RefreshCw, X } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { useI18n } from '../i18n';

/** 同步状态横幅（三种形态共享一个吸顶外壳）：
 *  - 'error'：红色横条，点击重试 flush pending 队列（重试中禁用关闭）。
 *  - 'local'：本地模式（在线演示/无后端）——蓝色信息条，说明进度仅存本浏览器，无重试。
 *    关闭一次即永久关闭（localStorage 记忆）——常用者/本地学习者不该每次都被提示。
 *  - 'remote-invalid'：服务器在线但远端快照是旧格式/损坏，已忽略——琥珀色警示条，
 *    说明进度暂以本浏览器为准、下次保存自动修复。会话级关闭（重开页面再看一眼是合理的），
 *    无重试按钮（重试无用：等下一次保存自然修复）。
 *  正常状态下不渲染，不打扰刷题。 */
const LOCAL_DISMISS_KEY = 'ask-banner-local-dismissed';

function BannerShell({
  className, icon, text, onClose, closeLabel, children,
}: {
  className: string;
  icon: ReactNode;
  text: string;
  onClose: (() => void) | null;
  closeLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className={`sticky top-16 z-30 text-white px-4 py-2 flex items-center gap-2 text-sm shadow-md ${className}`}>
      {icon}
      <span className="flex-1 min-w-0 truncate">{text}</span>
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function SyncStatusBanner() {
  const { syncStatus, retrySync } = useProgress();
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);
  // local 横幅：localStorage 持久化（v1 是会话级 dismissed，会被每次刷新打扰）；
  // error / remote-invalid 横幅独立会话级——出错每次都该看到（能点重试），
  // 旧格式告知重开页面再看一眼也合理，不受 local 关闭影响。
  const [localDismissed, setLocalDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_DISMISS_KEY) === '1'
  );
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [remoteInvalidDismissed, setRemoteInvalidDismissed] = useState(false);
  const dismissLocal = () => {
    setLocalDismissed(true);
    try { localStorage.setItem(LOCAL_DISMISS_KEY, '1'); } catch { /* 隐私模式等写入失败可忽略 */ }
  };

  // 本地模式：友好提示替代报错（demo 访客不该看到"同步失败"误以为有 bug）
  if (syncStatus === 'local' && !localDismissed) {
    return (
      <BannerShell
        className="bg-sky-600"
        icon={<Info className="h-4 w-4 shrink-0" strokeWidth={2} />}
        text={t('sync.local')}
        onClose={dismissLocal}
        closeLabel={t('sync.close')}
      />
    );
  }

  // 远端快照不合格（旧格式）：显式告知已忽略 + 会自愈，绝不静默降级本地模式
  if (syncStatus === 'remote-invalid' && !remoteInvalidDismissed) {
    return (
      <BannerShell
        className="bg-amber-500"
        icon={<AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />}
        text={t('sync.remoteInvalid')}
        onClose={() => setRemoteInvalidDismissed(true)}
        closeLabel={t('sync.close')}
      />
    );
  }

  if (syncStatus !== 'error' || errorDismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    await retrySync();
    setRetrying(false);
  };

  return (
    <BannerShell
      className="bg-red-600"
      icon={<CloudOff className="h-4 w-4 shrink-0" strokeWidth={2} />}
      text={retrying ? t('sync.retrying') : t('sync.error')}
      onClose={retrying ? null : () => setErrorDismissed(true)}
      closeLabel={t('sync.close')}
    >
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="shrink-0 flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} strokeWidth={2} />
        {t('sync.retry')}
      </button>
    </BannerShell>
  );
}
