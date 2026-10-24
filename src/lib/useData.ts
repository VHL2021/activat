import { useCallback, useEffect, useState } from "react";

// Carga datos al montar (y cuando cambian deps); reload() los vuelve a pedir.
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [run]);

  useEffect(() => {
    let current = true;
    run()
      .then((value) => current && (setData(value), setError(null)))
      .catch((e) => current && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      current = false;
    };
  }, [run]);

  return { data, error, reload };
}
