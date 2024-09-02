import Slide from "@mui/material/Slide";
import { SnackbarClassKey } from "@mui/material/Snackbar";

import { SnackbarItemProps } from "./SnackbarItem";
import { Snack } from "./SnackbarProvider";
import {
  CloseReason,
  ContainerClassKey,
  SnackbarOrigin,
  SnackbarProviderProps,
  VariantClassKey,
  VariantType
} from "./types";

export const allClasses: {
  mui: Record<SnackbarClassKey, object>;
  container: Record<ContainerClassKey, object>;
} = {
  mui: {
    root: {},
    anchorOriginTopCenter: {},
    anchorOriginBottomCenter: {},
    anchorOriginTopRight: {},
    anchorOriginBottomRight: {},
    anchorOriginTopLeft: {},
    anchorOriginBottomLeft: {}
  },
  container: {
    containerRoot: {},
    containerAnchorOriginTopCenter: {},
    containerAnchorOriginBottomCenter: {},
    containerAnchorOriginTopRight: {},
    containerAnchorOriginBottomRight: {},
    containerAnchorOriginTopLeft: {},
    containerAnchorOriginBottomLeft: {}
  }
};

export const SNACKBAR_INDENTS = {
  view: { default: 20, dense: 4 },
  snackbar: { default: 6, dense: 2 }
};

export const DEFAULTS = {
  maxSnack: 3,
  dense: false,
  hideIconVariant: false,
  variant: "default" as VariantType,
  autoHideDuration: 5000,
  anchorOrigin: { vertical: "bottom", horizontal: "left" } as SnackbarOrigin,
  TransitionComponent: Slide,
  transitionDuration: {
    enter: 225,
    exit: 195
  }
};

export const capitalise = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const originKeyExtractor = (anchor: Snack["anchorOrigin"]): string =>
  `${capitalise(anchor.vertical)}${capitalise(anchor.horizontal)}`;

/**
 * Omit SnackbarContainer class keys that are not needed for SnackbarItem
 */
export const omitContainerKeys = (
  classes: SnackbarProviderProps["classes"]
): SnackbarItemProps["classes"] =>
  // @ts-ignore
  Object.keys(classes)
    .filter((key) => !allClasses.container[key])
    .reduce((obj, key) => ({ ...obj, [key]: classes[key] }), {});

export const REASONS: { [key: string]: CloseReason } = {
  TIMEOUT: "timeout",
  CLICKAWAY: "clickaway",
  MAXSNACK: "maxsnack",
  INSTRUCTED: "instructed"
};

/** Tranforms classes name */
export const transformer = {
  toContainerAnchorOrigin: (origin: string) =>
    `containerAnchorOrigin${origin}` as ContainerClassKey,
  toAnchorOrigin: ({ vertical, horizontal }: SnackbarOrigin) =>
    `anchorOrigin${capitalise(vertical)}${capitalise(
      horizontal
    )}` as SnackbarClassKey,
  toVariant: (variant: VariantType) =>
    `variant${capitalise(variant)}` as VariantClassKey
};

export const isDefined = (value: string | null | undefined | number): boolean =>
  !!value || value === 0;

export function objectMerge(options = {}, props = {}, defaults = {}) {
  return {
    ...defaults,
    ...props,
    ...options
  };
}
