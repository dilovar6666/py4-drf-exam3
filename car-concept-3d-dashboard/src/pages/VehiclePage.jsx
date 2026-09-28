import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getAccessToken } from "../api.js";
import { carName, getCatalog, listAll } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import ThreeScene, { ComponentTooltip } from "../components/ThreeScene.jsx";
import ComponentInfo from "../components/ComponentInfo.jsx";
import { Button, StateView, SearchInput } from "../components/UI.jsx";
import { STORY_STAGES } from "../three/story.js";
import { buildCinematicVehicleConfig, getVehicleConfig } from "../models/vehicleCatalog.js";
import { resolveVehicleModelUrl } from "../three/modelUrl.js";
import AIAssistant from "../components/AIAssistant.jsx";
import GestureControl from "../components/GestureControl.jsx";
import { API_BASE_URL } from "../api.js";

export default function VehiclePage() {
  const { carId, componentId } = useParams(),
    navigate = useNavigate();
  const storyRef = useRef(null),
    controllerRef = useRef(null);
  const [hover, setHover] = useState(null),
    [selected, setSelected] = useState(componentId || null),
    [ready, setReady] = useState(false);
  const [stage, setStage] = useState(0),
    [explode, setExplode] = useState(0),
    [indexOpen, setIndexOpen] = useState(false),
    [search, setSearch] = useState("");
  const state = useApi(async () => {
    const [car, catalog, components, cinematic] = await Promise.all([
      api.car(carId),
      getCatalog(),
      listAll(`/api/cars/${carId}/parts/`),
      api.cinematicCar(carId),
    ]);
    const model = catalog.models.find((row) => row.id === car.car_model);
    const brand = catalog.brands.find((row) => row.id === model?.brand);
    return {
      car: { ...car, model_name: model?.name, brand_name: brand?.name },
      catalog,
      cinematic,
      components: components.map((row) => ({
        ...row,
        category_name: catalog.categories.find((cat) => cat.id === row.category)
          ?.name,
      })),
    };
  }, [carId]);
  const title = state.data ? carName(state.data.car, state.data.catalog) : "";
  const registeredConfig = getVehicleConfig(state.data?.car);
  const cinematicConfig = useMemo(
    () => buildCinematicVehicleConfig(state.data?.car, state.data?.components, state.data?.cinematic),
    [state.data?.car, state.data?.components, state.data?.cinematic],
  );
  const modelConfig = useMemo(
    () => registeredConfig
      ? { ...registeredConfig, storyStages: cinematicConfig?.storyStages || registeredConfig.storyStages }
      : cinematicConfig,
    [registeredConfig, cinematicConfig],
  );
  const storyStages = modelConfig?.storyStages || STORY_STAGES;
  const component = state.data?.components.find(
    (row) => row.component_id === (componentId || selected),
  );
  const interactiveComponents = state.data?.components.filter((row) =>
    !modelConfig || Object.hasOwn(modelConfig.components, row.component_id),
  ) || [];
  useEffect(() => {
    if (getAccessToken() && state.data?.car?.id) api.recordRecentlyViewed("car", state.data.car.id).catch(() => {});
  }, [state.data?.car?.id]);
  useEffect(() => {
    if (getAccessToken() && component?.id) api.recordRecentlyViewed("component", component.id).catch(() => {});
  }, [component?.id]);
  const config = modelConfig?.components[componentId || selected];
  const fallback = config ? { ...config, componentId: selected } : null;
  useEffect(() => {
    setReady(false);
    setSelected(componentId || null);
  }, [carId]);
  useEffect(() => {
    if (!ready) return;
    if (componentId) {
      setSelected(componentId);
      controllerRef.current?.setExplodeProgress(0.65);
      controllerRef.current?.focusComponent(componentId, false);
    } else if (selected) {
      controllerRef.current?.reset();
      setSelected(null);
    }
  }, [componentId, ready]);
  function closeInfo() {
    controllerRef.current?.reset();
    setSelected(null);
    if (componentId) navigate(`/cars/${carId}`);
  }
  function select(id) {
    setSelected(id);
    setIndexOpen(false);
  }
  if (state.loading || state.error)
    return (
      <main className="page">
        <StateView {...state} />
      </main>
    );
  if (!modelConfig)
    return (
      <main className="page static-vehicle-page">
        <p className="eyebrow">{state.data.car.year}</p>
        <h1>{title}</h1>
        <p>{state.data.car.description}</p>
        {state.data.car.image_url && (
          <img
            className="vehicle-static-preview"
            src={state.data.car.image_url}
            alt={title}
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        {componentId ? (
          component ? (
            <ComponentInfo
              carId={carId}
              component={component}
              onClose={() => navigate(`/cars/${carId}`)}
              deep
            />
          ) : (
            <StateView empty="This component has not been published for this vehicle." />
          )
        ) : (
          <StateView empty="The interactive exhibit for this vehicle is not prepared yet." />
        )}
        <Button to="/cars">Return to collection</Button>
      </main>
    );
  if (componentId && !config)
    return (
      <main className="page">
        <StateView empty="This component does not exist in this vehicle hierarchy." />
        <Button to={`/cars/${carId}`}>Return to vehicle</Button>
      </main>
    );
  const allComponents = Object.entries(modelConfig.components)
    .map(([id, data]) => ({ id, ...data }))
    .filter((row) =>
      `${row.displayName} ${row.id} ${row.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <main
      className={`vehicle-page ${componentId ? "vehicle-page--deep" : ""} ${selected ? "vehicle-page--selected" : ""}`}
    >
      <div className="vehicle-canvas">
        <ThreeScene
          modelUrl={resolveVehicleModelUrl(state.data.car.model_url, window.location.origin, API_BASE_URL)}
          modelConfig={modelConfig}
          storyRef={storyRef}
          controllerRef={controllerRef}
          onReady={() => setReady(true)}
          onHover={setHover}
          onSelect={select}
          onStory={(pose) => {
            setStage(pose.stage);
            setExplode(pose.explode);
          }}
        />
      </div>
      <div className="vehicle-identity">
        <Link to="/cars" className="text-link">
          ← Collection
        </Link>
        <h1>{title}</h1>
        <span className="eyebrow">
          {state.data.car.year || "Year not documented"} / Interactive exhibit
        </span>
      </div>
      {!componentId && (
        <div className="vehicle-story" ref={storyRef}>
          {storyStages.map((chapter, i) => (
            <section
              className={`story-chapter story-chapter--${i}`}
              id={`chapter-${i}`}
              key={chapter.title}
            >
              <div>
                <p className="eyebrow">
                  {String(i + 1).padStart(2, "0")} / {chapter.title}
                </p>
                <h2>
                  {chapter.title === "Design"
                    ? "The complete machine."
                    : chapter.title}
                </h2>
                <p>{chapter.text}</p>
                {chapter.title === "Specifications" && <div className="vehicle-specifications">{Object.entries(state.data.car.specifications || {}).length ? Object.entries(state.data.car.specifications).map(([key, value]) => <p key={key}><strong>{key.replaceAll("_", " ")}</strong><span>{String(value)}</span></p>) : <p>No verified specifications have been published for this vehicle.</p>}</div>}
                {chapter.title === "Store" && <Link className="text-link" to={`/store?car=${carId}`}>Browse recorded compatible products →</Link>}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="vehicle-controls">
        <span className="eyebrow">
          {String(stage + 1).padStart(2, "0")} / {storyStages[stage].title}
        </span>
        <span>{Math.round(explode * 100)}% disassembled</span>
        <label className="explode-slider"><span>Explode</span><input type="range" min="0" max="100" value={Math.round(explode * 100)} onChange={(event) => controllerRef.current?.setExplodeProgress(Number(event.target.value) / 100)} aria-label="Semantic explode percentage" /></label>
        <button onClick={() => setIndexOpen(!indexOpen)}>
          Components · {Object.keys(modelConfig.components).length}
        </button>
        <button onClick={closeInfo}>Reset view</button>
      </div>
      <p className="orbit-hint">
        Drag to orbit · Scroll to reveal · Tap a component
      </p>
      {indexOpen && (
        <aside className="component-index">
          <header>
            <h2>Component index</h2>
            <button
              className="icon-button"
              aria-label="Close component index"
              onClick={() => setIndexOpen(false)}
            >
              ×
            </button>
          </header>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {allComponents.map((row) => (
            <button
              key={row.id}
              onClick={() => {
                controllerRef.current?.focusComponent(row.id);
                select(row.id);
              }}
            >
              <span>{row.displayName}</span>
              <small>{row.category}</small>
            </button>
          ))}
        </aside>
      )}
      <ComponentTooltip hover={hover} />
      {selected && (
        <ComponentInfo
          carId={carId}
          component={component}
          fallback={fallback}
          onClose={closeInfo}
          deep={Boolean(componentId)}
        />
      )}
      <AIAssistant carId={Number(carId)} component={component} components={interactiveComponents} controllerRef={controllerRef} explodePercent={Math.round(explode * 100)} />
      <GestureControl explodePercent={explode * 100} onExplode={(value) => controllerRef.current?.setExplodeProgress(value / 100)} controllerRef={controllerRef} selectedComponentId={selected} />
    </main>
  );
}
