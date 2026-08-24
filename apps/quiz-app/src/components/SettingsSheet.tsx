import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { useI18n } from '../i18n';

/** 开关行：label/desc 左，toggle 右。aria role=switch，键盘可操作（button 天然支持）。 */
function ToggleRow({
  label, desc, on, onChange,
}: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`shrink-0 w-10 h-6 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-bg-hover border border-border'}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

/** 设置面板（学习偏好）：拓展开关 / 答对自动跳题 / 每日新卡配额。
 *  手机底部弹层、桌面居中卡片；改动即时写入 progress.settings（LWW 跨设备同步）。
 *  默认值语义见 types.LearnSettings：extOn 缺省=关、autoAdvance 缺省=开、dailyNewCards 缺省=5。 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { progress, updateSettings } = useProgress();
  const { t } = useI18n();
  const extOn = progress.settings?.extOn === true;
  const autoAdvance = progress.settings?.autoAdvance !== false;
  // 配额输入用本地草稿（空串允许，失焦/保存时校验），面板开着不因每次击键写进度
  const [quotaDraft, setQuotaDraft] = useState(String(progress.settings?.dailyNewCards ?? 5));

  // Esc 关闭（移动端习惯：点遮罩关，见下方 backdrop onClick）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clampQuota = (raw: string) => Math.max(0, Math.min(50, parseInt(raw, 10) || 0));
  const commitQuota = () => {
    const n = clampQuota(quotaDraft);
    setQuotaDraft(String(n));
    if (n !== (progress.settings?.dailyNewCards ?? 5)) updateSettings({ dailyNewCards: n });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full sm:max-w-md bg-bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-bg-surface">
          <h2 className="text-base font-semibold text-text-primary">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-accent hover:bg-bg-hover transition-colors"
            aria-label={t('settings.close')}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 divide-y divide-border">
          <ToggleRow
            label={t('settings.extLabel')}
            desc={t('settings.extDesc')}
            on={extOn}
            onChange={(v) => updateSettings({ extOn: v })}
          />
          <ToggleRow
            label={t('settings.autoLabel')}
            desc={t('settings.autoDesc')}
            on={autoAdvance}
            onChange={(v) => updateSettings({ autoAdvance: v })}
          />
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{t('settings.quotaLabel')}</div>
              <div className="text-xs text-text-muted mt-0.5">{t('settings.quotaDesc')}</div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={() => { const n = clampQuota(String(clampQuota(quotaDraft) - 1)); setQuotaDraft(String(n)); updateSettings({ dailyNewCards: n }); }}
                className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-bg-hover transition-colors"
                aria-label={t('settings.quotaMinus')}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <input
                value={quotaDraft}
                onChange={(e) => setQuotaDraft(e.target.value)}
                onBlur={commitQuota}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                inputMode="numeric"
                className="w-14 text-center text-sm tabular-nums rounded-lg border border-border bg-bg-subtle px-1.5 py-1.5 text-text-primary focus:outline-none focus:border-indigo-400"
                aria-label={t('settings.quotaLabel')}
              />
              <button
                onClick={() => { const n = clampQuota(String(clampQuota(quotaDraft) + 1)); setQuotaDraft(String(n)); updateSettings({ dailyNewCards: n }); }}
                className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-bg-hover transition-colors"
                aria-label={t('settings.quotaPlus')}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 text-[11px] text-text-faint">{t('settings.syncHint')}</div>
      </div>
    </div>
  );
}
