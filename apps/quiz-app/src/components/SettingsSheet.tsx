import { useEffect, useMemo, useState } from 'react';
import { X, Minus, Plus, RotateCcw, Trash2, Eraser } from 'lucide-react';
import { questions } from '../data/questions';
import { flashcards } from '../data/flashcards';
import { clearPos } from '../lib/posMemory';
import { useProgress } from '../hooks/useProgress';
import { useI18n } from '../i18n';
import { useConfirm } from './ConfirmDialog';
import { Button3D, Switch } from './ui';

/** 开关行：label/desc 左，Switch 基元右（role=switch，键盘可操作——button 天然支持）。 */
function ToggleRow({
  label, desc, on, onChange,
}: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">{desc}</div>
      </div>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

/** 危险区小按钮（原型 .dzbtn）：描边白卡，操作经确认弹窗后才执行。 */
function DangerBtn({
  label, icon: Icon, onClick, className = '',
}: { label: string; icon: typeof Trash2; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-bg-surface px-2 py-2.5 text-[13px] font-bold leading-tight text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/** 设置面板：学习偏好 + 数据重置（v0.25 票②，spec #110 Q1——原首页「进度管理」
 *  折叠区的四个重置入口收口至此，红色危险区隔离、确认弹窗照旧）。
 *  手机底部弹层、桌面居中卡片；偏好改动即时写入 progress.settings（LWW 跨设备同步）。
 *  默认值语义见 types.LearnSettings：extOn 缺省=关、autoAdvance 缺省=开、dailyNewCards 缺省=5。
 *  重置的多主题隔离：只清激活主题的进度（题/卡 id 集），不误伤其他主题。 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { progress, updateSettings, resetWrong, resetRead, resetTheme } = useProgress();
  const { t } = useI18n();
  const confirm = useConfirm();
  const extOn = progress.settings?.extOn === true;
  const autoAdvance = progress.settings?.autoAdvance !== false;
  // 配额输入用本地草稿（空串允许，失焦/保存时校验），面板开着不因每次击键写进度
  const [quotaDraft, setQuotaDraft] = useState(String(progress.settings?.dailyNewCards ?? 5));

  // 多主题隔离：数据重置只作用于激活主题的题/卡 id 集（questions/flashcards 即激活主题数据）
  const themeQuestionIds = useMemo(() => questions.map((q) => q.id), []);
  const themeCardIds = useMemo(() => flashcards.map((f) => f.id), []);

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

  // 数据重置四件（确认弹窗照旧；「按题集清」的细粒度重置留在练习页题目列表内，不在此重复）
  const onResetPos = async () => {
    if (await confirm(t('settings.confirmResetPos'))) clearPos('all');
  };
  const onResetWrong = async () => {
    if (await confirm(t('settings.confirmResetWrong'))) resetWrong(themeQuestionIds);
  };
  const onResetRead = async () => {
    if (await confirm(t('settings.confirmResetRead'))) resetRead(themeQuestionIds);
  };
  const onResetTheme = async () => {
    if (await confirm(t('settings.confirmResetAllTheme'))) resetTheme(themeQuestionIds, themeCardIds);
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
                className="w-14 text-center text-sm tabular-nums rounded-lg border border-border bg-bg-subtle px-1.5 py-1.5 text-text-primary focus:outline-none focus:border-st-blue"
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

        {/* 数据重置节（v0.25 票②）：红色危险区隔离，四件全部只作用于当前主题。
            确认弹窗经 portal 挂 body 尾（同为 z-50、DOM 序在后），会盖在本弹层之上。 */}
        <section
          aria-label={t('settings.resetTitle')}
          className="mx-5 my-4 rounded-[14px] border-2 border-st-red-border bg-st-red-soft/40 p-4"
        >
          <h3 className="text-[13px] font-extrabold tracking-wide text-st-red-ink mb-2.5">
            {t('settings.resetTitle')}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <DangerBtn label={t('settings.resetPos')} icon={RotateCcw} onClick={onResetPos} />
            <DangerBtn label={t('settings.resetWrong')} icon={Trash2} onClick={onResetWrong} />
            <DangerBtn label={t('settings.resetRead')} icon={Eraser} onClick={onResetRead} />
          </div>
          <Button3D variant="red" className="w-full" onClick={onResetTheme}>
            <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {t('settings.resetAllTheme')}
          </Button3D>
        </section>

        <div className="px-5 pb-3 text-[11px] text-text-faint">{t('settings.syncHint')}</div>
      </div>
    </div>
  );
}
