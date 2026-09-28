import ThreeScene from "../components/ThreeScene.jsx";
import { Button } from "../components/UI.jsx";
import { useLanguage } from "../i18n.js";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">{t("homeEyebrow")}</p>
          <h1>
            {t("understand")}.
            <br />
            <em>{t("partByPart")}</em>
          </h1>
          <p>
            {t("homeDescription")}
          </p>
          <div className="actions">
            <Button to="/cars">{t("exploreCars")} ↗</Button>
            <Button to="/about" secondary>
              {t("learnMore")}
            </Button>
          </div>
        </div>
        <div className="home-hero__vehicle">
          <ThreeScene modelUrl="/assets/models/AudiR8.glb" preview />
          <span className="home-hero__caption">
            {t("firstExhibit")}
          </span>
        </div>
      </section>
    </main>
  );
}
