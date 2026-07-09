import { useCallback, useRef, useState } from 'react';

// Prevents double-submits. Wrap any async action (save, delete, submit, enroll).
// While the action is running, `loading` is true and any further calls are
// ignored — so a user mashing a button 5 times still triggers the action ONCE.
//
// Usage:
//   const { run, loading } = useAsyncAction(async () => {
//     await createUser(form);
//   });
//   <Button disabled={loading} onClick={run}>
//     {loading ? 'Saving…' : 'Save'}
//   </Button>
export default function useAsyncAction(action) {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args) => {
      if (inFlight.current) return undefined; // ignore repeat clicks
      inFlight.current = true;
      setLoading(true);
      try {
        return await action(...args);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [action]
  );

  return { run, loading };
}
