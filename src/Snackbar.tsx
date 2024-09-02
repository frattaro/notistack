import ClickAwayListener from "@mui/material/ClickAwayListener";
import { useCallback, useEffect, useRef } from "react";

import { REASONS } from "./constants";
import { CloseReason, SnackbarProps } from "./types";
import useEventCallback from "./useEventCallback";

export default function Snackbar(
  props: SnackbarProps & {
    open: boolean;
    onClose: (
      event: MouseEvent | TouchEvent | null,
      reason: CloseReason
    ) => void;
  }
) {
  const {
    children,
    autoHideDuration,
    ClickAwayListenerProps,
    disableWindowBlurListener = false,
    onClose,
    onMouseEnter,
    onMouseLeave,
    open,
    ref,
    resumeHideDuration,
    ...other
  } = props;

  const timerAutoHide = useRef<ReturnType<typeof setTimeout>>();

  const handleClose = useEventCallback(onClose);

  const setAutoHideTimer = useEventCallback((autoHideDurationParam) => {
    if (!onClose || autoHideDurationParam == null) {
      return;
    }

    clearTimeout(timerAutoHide.current);
    timerAutoHide.current = setTimeout(() => {
      handleClose(null, REASONS.TIMEOUT);
    }, autoHideDurationParam);
  });

  useEffect(() => {
    if (open) {
      setAutoHideTimer(autoHideDuration);
    }

    return () => {
      clearTimeout(timerAutoHide.current);
    };
  }, [open, autoHideDuration, setAutoHideTimer]);

  /**
   * Pause the timer when the user is interacting with the Snackbar
   * or when the user hide the window.
   */
  const handlePause = () => {
    clearTimeout(timerAutoHide.current);
  };

  /**
   * Restart the timer when the user is no longer interacting with the Snackbar
   * or when the window is shown back.
   */
  const handleResume = useCallback(() => {
    if (autoHideDuration != null) {
      setAutoHideTimer(
        resumeHideDuration != null ? resumeHideDuration : autoHideDuration * 0.5
      );
    }
  }, [autoHideDuration, resumeHideDuration, setAutoHideTimer]);

  useEffect(() => {
    if (!disableWindowBlurListener && open) {
      window.addEventListener("focus", handleResume);
      window.addEventListener("blur", handlePause);

      return () => {
        window.removeEventListener("focus", handleResume);
        window.removeEventListener("blur", handlePause);
      };
    }

    return undefined;
  }, [disableWindowBlurListener, handleResume, open]);

  return (
    <ClickAwayListener
      {...ClickAwayListenerProps}
      onClickAway={(event) => {
        onClose?.(event, REASONS.CLICKAWAY);
      }}
    >
      <div
        {...other}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          handlePause();
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          handleResume();
        }}
      >
        {children}
      </div>
    </ClickAwayListener>
  );
}
