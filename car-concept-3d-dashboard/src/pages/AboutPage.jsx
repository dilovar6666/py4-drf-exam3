import { Button } from "../components/UI.jsx";
import { useLanguage } from "../i18n.js";

export default function AboutPage() {
  const { t } = useLanguage();
  const topics = [["infoThreeD", "infoThreeDText"], ["infoComponents", "infoComponentsText"], ["infoExplode", "infoExplodeText"], ["infoStore", "infoStoreText"], ["infoAI", "infoAIText"], ["infoGestures", "infoGesturesText"], ["infoGarage", "infoGarageText"]];
  return <main className="page about-page"><p className="eyebrow">Auto Anatomy / {t("info")}</p><h1>{t("infoTitle")}</h1><p className="lead">{t("infoIntro")}</p><div className="info-grid">{topics.map(([title, description], index) => <article key={title}><span className="eyebrow">{String(index + 1).padStart(2, "0")}</span><h2>{t(title)}</h2><p>{t(description)}</p></article>)}</div><p className="info-privacy">{t("infoCameraPrivacy")}</p><Button to="/cars">{t("exploreCars")}</Button></main>;
}
