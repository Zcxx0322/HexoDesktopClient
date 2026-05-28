import { useConfigStore } from '@/store/configStore';
import type { Locale } from '@/i18n/translations';
import { t } from '@/i18n/translations';

export function useLocale() {
  const config = useConfigStore((s) => s.config);
  const locale: Locale = (config?.locale as Locale) || 'zh-CN';
  return {
    locale,
    t: (key: string) => t[locale]?.[key] || t['zh-CN']?.[key] || key,
  };
}
