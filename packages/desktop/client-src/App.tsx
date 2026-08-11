import { useSettings } from "./hooks/useSettings";
import { AppGlobalStyles } from "./theme/GlobalStyles";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { detectLocale } from "./i18n";
import { Capsule } from "./views/capsules/index";
import { Settings } from "./views/settings/index";

type WindowType = "capsule" | "settings";

const getWindowType = (): WindowType => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("window");
  if (type === "settings") {
    return "settings";
  }
  return "capsule";
};

export const App = () => {
  const { i18n } = useTranslation();
  const { config } = useSettings();
  const windowType = getWindowType();

  useEffect(() => {
    const locale = detectLocale(config?.desktop?.uiLocale);
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [config?.desktop?.uiLocale, i18n]);

  return (
    <>
      <AppGlobalStyles />
      {windowType === "capsule" && <Capsule />}
      {windowType === "settings" && <Settings />}
    </>
  );
};
