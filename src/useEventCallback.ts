/**
 * @link https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/utils/useEventCallback.js
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const useEnhancedEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function useEventCallback(fn) {
  const ref = useRef(fn);
  useEnhancedEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => (0, ref.current)(...args), []);
}
