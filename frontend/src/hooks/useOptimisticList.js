import { useState, useCallback } from 'react';

// Optimistic list updates: change what the user sees INSTANTLY, then run the
// server call in the background. If the server call fails, roll the UI back and
// report the error. This is what makes a delete feel instant instead of
// "click → spinner → wait → it disappears".
//
// Typical usage (optimistic delete):
//   const { items, setItems, removeOptimistic } = useOptimisticList(users);
//   ...
//   removeOptimistic(
//     (u) => u.user_id === id,            // which item(s) to drop
//     () => deactivateUser(id),           // the server call
//     (err) => toast(apiErrorMessage(err))// runs only if it failed (after rollback)
//   );
//
// Keep predicates id-based (e.g. compare a stable id) so rollback is reliable.
export default function useOptimisticList(initial = []) {
  const [items, setItems] = useState(initial);

  const removeOptimistic = useCallback(async (predicate, serverCall, onError) => {
    let removed = [];
    setItems((prev) => {
      removed = prev.filter(predicate);
      return prev.filter((x) => !predicate(x));
    });
    try {
      await serverCall();
    } catch (err) {
      setItems((prev) => [...removed, ...prev]); // rollback
      if (onError) onError(err);
    }
  }, []);

  const addOptimistic = useCallback(async (tempItem, serverCall, onError) => {
    setItems((prev) => [tempItem, ...prev]);
    try {
      const saved = await serverCall();
      if (saved) setItems((prev) => prev.map((x) => (x === tempItem ? saved : x)));
    } catch (err) {
      setItems((prev) => prev.filter((x) => x !== tempItem)); // rollback
      if (onError) onError(err);
    }
  }, []);

  const updateOptimistic = useCallback(async (predicate, patch, serverCall, onError) => {
    const snapshot = new Map();
    setItems((prev) =>
      prev.map((x) => {
        if (predicate(x)) {
          snapshot.set(x, x);
          return { ...x, ...patch };
        }
        return x;
      })
    );
    try {
      await serverCall();
    } catch (err) {
      setItems((prev) => prev.map((x) => snapshot.get(x) || x)); // rollback
      if (onError) onError(err);
    }
  }, []);

  return { items, setItems, removeOptimistic, addOptimistic, updateOptimistic };
}
