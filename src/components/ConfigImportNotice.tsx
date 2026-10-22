import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppAlertDialog } from '@/components/ui/AppAlertDialog';
import { getUnifiedEngineService } from '@/platform/engine';
import { useUnifiedEngineStore } from '@/stores/unifiedEngineStore';

/** The stable app root owns this notice. Acknowledgement never changes Engine data. */
export function ConfigImportNotice() {
  const { t } = useTranslation('common');
  const status = useUnifiedEngineStore((state) => state.configImportStatus);
  const isStarted = useUnifiedEngineStore((state) => state.isStarted);
  const [appState, setAppState] = useState(AppState.currentState);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const rejection = status.kind === 'checked' ? status.rejection : null;
  const unavailable = status.kind === 'unavailable';
  const key = rejection ? `rejected:${rejection.reason}` : unavailable ? 'unavailable' : null;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (key === null) setDismissed(null);
  }, [key]);

  if (!isStarted || appState !== 'active' || key === null) return null;
  const dismiss = () => setDismissed(key);
  return (
    <AppAlertDialog
      standalone
      visible={dismissed !== key}
      title={t(unavailable ? 'configImport.unavailableTitle' : 'configImport.rejectedTitle')}
      message={unavailable
        ? t('configImport.unavailableMessage')
        : `${t(`configImport.reason.${rejection!.reason}`)}\n\n${t('configImport.reexport')}`}
      confirmLabel={t(unavailable ? 'action.retry' : 'action.ok')}
      onConfirm={unavailable
        ? () => void getUnifiedEngineService().refreshRejectedConfigImport()
        : dismiss}
      dismissLabel={unavailable ? t('action.close') : undefined}
      onDismiss={dismiss}
    />
  );
}
