import { useEffect, useState } from "react";

export function useApi(load, dependencies = []) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: null });
    Promise.resolve()
      .then(load)
      .then((data) => {
        if (active) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (active) setState({ loading: false, data: null, error });
      });
    return () => {
      active = false;
    };
  }, [...dependencies, revision]);
  return { ...state, retry: () => setRevision((n) => n + 1) };
}
