import { useEffect, useRef, useState } from "react";

export function LoadingScreen({ percent }) {
  return (
    <div className="vehicle-loading" role="status">
      <span className="eyebrow">Auto Anatomy</span>
      <h2>Preparing the vehicle</h2>
      <div className="vehicle-loading__track">
        <i style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}%</small>
    </div>
  );
}
export function ComponentTooltip({ hover }) {
  return hover ? (
    <div
      className="component-tooltip"
      role="tooltip"
      style={{
        left: Math.min(hover.x + 16, innerWidth - 240),
        top: Math.min(hover.y + 16, innerHeight - 60),
      }}
    >
      {hover.name}
    </div>
  ) : null;
}

export default function ThreeScene({
  modelUrl,
  modelConfig,
  storyRef,
  preview,
  controllerRef,
  onReady,
  onHover,
  onSelect,
  onStory,
}) {
  const container = useRef(null),
    callbacks = useRef({ onReady, onHover, onSelect, onStory });
  callbacks.current = { onReady, onHover, onSelect, onStory };
  const [loading, setLoading] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState(null);
  useEffect(() => {
    setReady(false);
    setError(null);
    setLoading(0);
    let controller,
      canceled = false;
    import("../three/vehicleScene.js")
      .then(({ createVehicleScene }) => {
        if (canceled) return;
        controller = createVehicleScene(container.current, {
          modelUrl,
          modelConfig,
          storyElement: storyRef?.current,
          preview,
          onProgress: setLoading,
          onReady: (value) => {
            setReady(true);
            callbacks.current.onReady?.(value);
          },
          onHover: (value) => callbacks.current.onHover?.(value),
          onSelect: (value) => callbacks.current.onSelect?.(value),
          onStory: (value) => callbacks.current.onStory?.(value),
          onError: setError,
        });
        if (controllerRef) controllerRef.current = controller;
      })
      .catch(setError);
    return () => {
      canceled = true;
      controller?.dispose();
      if (controllerRef?.current === controller) controllerRef.current = null;
    };
  }, [modelUrl, modelConfig, preview]);
  return (
    <div
      className={`three-scene ${preview ? "three-scene--preview" : ""}`}
      ref={container}
      aria-label="Interactive 3D vehicle"
    >
      {!ready && !error && <LoadingScreen percent={loading} />}
      {error && (
        <div className="vehicle-loading" role="alert">
          <h2>Vehicle could not be loaded</h2>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
}
