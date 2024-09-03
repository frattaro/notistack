import clsx from "clsx";
import { Component, createContext, useContext } from "react";
import { createPortal } from "react-dom";

import SnackbarContainer from "./SnackbarContainer";
import SnackbarItem from "./SnackbarItem";
import {
  DEFAULTS,
  REASONS,
  isDefined,
  omitContainerKeys,
  originKeyExtractor,
  transformer
} from "./constants";
import {
  OptionsObject,
  ProviderContext,
  RequiredBy,
  SnackbarKey,
  SnackbarMessage,
  SnackbarProviderProps,
  TransitionHandlerProps
} from "./types";

type Reducer = (state: State) => State;
type SnacksByPosition = { [key: string]: Snack[] };

export interface Snack
  extends RequiredBy<OptionsObject, "key" | "variant" | "anchorOrigin"> {
  message: SnackbarMessage;
  open: boolean;
  entered: boolean;
  requestClose: boolean;
}

interface State {
  snacks: Snack[];
  queue: Snack[];
  contextValue: ProviderContext;
}

export const SnackbarContext = createContext<ProviderContext>({
  enqueueSnackbar: () => null,
  closeSnackbar: () => null
});

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export class SnackbarProvider extends Component<SnackbarProviderProps, State> {
  constructor(props: SnackbarProviderProps) {
    super(props);
    this.state = {
      snacks: [],
      queue: [], // eslint-disable-line react/no-unused-state
      contextValue: {
        enqueueSnackbar: this.enqueueSnackbar.bind(this),
        closeSnackbar: this.closeSnackbar.bind(this)
      }
    };
  }

  get maxSnack(): number {
    return this.props.maxSnack || DEFAULTS.maxSnack;
  }

  /**
   * Adds a new snackbar to the queue to be presented.
   * Returns generated or user defined key referencing the new snackbar or null
   */
  enqueueSnackbar = (
    message: SnackbarMessage,
    opts: OptionsObject = {}
  ): SnackbarKey => {
    const { key, preventDuplicate, ...options } = opts;

    const hasSpecifiedKey = isDefined(key);
    const id = hasSpecifiedKey
      ? (key as SnackbarKey)
      : new Date().getTime() + Math.random();

    const numberOrNull = (numberish?: number | null) =>
      typeof numberish === "number" || numberish === null;

    const merger = (name: keyof Snack) => {
      if (name === "autoHideDuration") {
        if (numberOrNull(options.autoHideDuration))
          return options.autoHideDuration;
        if (numberOrNull(this.props.autoHideDuration))
          return this.props.autoHideDuration;
        return DEFAULTS.autoHideDuration;
      }

      return options[name] || this.props[name] || DEFAULTS[name];
    };

    const snack: Snack = {
      key: id,
      ...options,
      message,
      open: true,
      entered: false,
      requestClose: false,
      variant: merger("variant"),
      anchorOrigin: merger("anchorOrigin"),
      autoHideDuration: merger("autoHideDuration")
    };

    if (options.persist) {
      snack.autoHideDuration = undefined;
    }

    this.setState((state) => {
      if (
        (preventDuplicate === undefined && this.props.preventDuplicate) ||
        preventDuplicate
      ) {
        const compareFunction = (item: Snack): boolean =>
          hasSpecifiedKey ? item.key === key : item.message === message;

        const inQueue = state.queue.findIndex(compareFunction) > -1;
        const inView = state.snacks.findIndex(compareFunction) > -1;
        if (inQueue || inView) {
          return state;
        }
      }

      return this.handleDisplaySnack({
        ...state,
        queue: [...state.queue, snack]
      });
    });

    return id;
  };

  /**
   * Reducer: Display snack if there's space for it. Otherwise, immediately
   * begin dismissing the oldest message to start showing the new one.
   */
  handleDisplaySnack: Reducer = (state) => {
    const { snacks } = state;
    if (snacks.length >= this.maxSnack) {
      return this.handleDismissOldest(state);
    }
    return this.processQueue(state);
  };

  /**
   * Reducer: Display items (notifications) in the queue if there's space for them.
   */
  processQueue: Reducer = (state) => {
    const { queue, snacks } = state;
    if (queue.length > 0) {
      return {
        ...state,
        snacks: [...snacks, queue[0]],
        queue: queue.slice(1, queue.length)
      };
    }
    return state;
  };

  /**
   * Reducer: Hide oldest snackbar on the screen because there exists a new one which we have to display.
   * (ignoring the one with 'persist' flag. i.e. explicitly told by user not to get dismissed).
   *
   * Note 1: If there is already a message leaving the screen, no new messages are dismissed.
   * Note 2: If the oldest message has not yet entered the screen, only a request to close the
   *         snackbar is made. Once it entered the screen, it will be immediately dismissed.
   */
  handleDismissOldest: Reducer = (state) => {
    if (state.snacks.some((item) => !item.open || item.requestClose)) {
      return state;
    }

    let popped = false;
    let ignore = false;

    const persistentCount = state.snacks.reduce(
      (acc, current) => acc + (current.open && current.persist ? 1 : 0),
      0
    );

    if (persistentCount === this.maxSnack) {
      ignore = true;
    }

    const snacks = state.snacks.map((item) => {
      if (!popped && (!item.persist || ignore)) {
        popped = true;

        if (!item.entered) {
          return {
            ...item,
            requestClose: true
          };
        }

        item.onClose?.(null, REASONS.MAXSNACK, item.key);
        this.props.onClose?.(null, REASONS.MAXSNACK, item.key);

        return {
          ...item,
          open: false
        };
      }

      return { ...item };
    });

    return { ...state, snacks };
  };

  /**
   * Set the entered state of the snackbar with the given key.
   */
  handleEnteredSnack: TransitionHandlerProps["onEntered"] = (
    node,
    isAppearing,
    key
  ) => {
    if (!isDefined(key)) {
      throw new Error("handleEnteredSnack Cannot be called with undefined key");
    }

    this.setState(({ snacks }) => ({
      snacks: snacks.map((item) =>
        item.key === key ? { ...item, entered: true } : { ...item }
      )
    }));
  };

  /**
   * Hide a snackbar after its timeout.
   */
  handleCloseSnack: TransitionHandlerProps["onClose"] = (
    event,
    reason,
    key
  ) => {
    this.props.onClose?.(event, reason, key);

    if (reason === REASONS.CLICKAWAY) return;
    const shouldCloseAll = key === undefined;

    this.setState(({ snacks, queue }) => ({
      snacks: snacks.map((item) => {
        if (!shouldCloseAll && item.key !== key) {
          return { ...item };
        }

        return item.entered
          ? { ...item, open: false }
          : { ...item, requestClose: true };
      }),
      queue: queue.filter((item) => item.key !== key) // eslint-disable-line react/no-unused-state
    }));
  };

  /**
   * Close snackbar with the given key
   */
  closeSnackbar: ProviderContext["closeSnackbar"] = (key) => {
    // call individual snackbar onClose callback passed through options parameter
    const toBeClosed = this.state.snacks.find((item) => item.key === key);
    if (isDefined(key)) {
      toBeClosed?.onClose?.(null, REASONS.INSTRUCTED, key);
    }

    this.handleCloseSnack(null, REASONS.INSTRUCTED, key);
  };

  /**
   * When we set open attribute of a snackbar to false (i.e. after we hide a snackbar),
   * it leaves the screen and immediately after leaving animation is done, this method
   * gets called. We remove the hidden snackbar from state and then display notifications
   * waiting in the queue (if any). If after this process the queue is not empty, the
   * oldest message is dismissed.
   */
  // @ts-ignore
  handleExitedSnack: TransitionHandlerProps["onExited"] = (
    event,
    key1,
    key2
  ) => {
    const key = key1 || key2;
    if (!isDefined(key)) {
      throw new Error("handleExitedSnack Cannot be called with undefined key");
    }

    this.setState((state) => {
      const newState = this.processQueue({
        ...state,
        snacks: state.snacks.filter((item) => item.key !== key)
      });

      if (newState.queue.length === 0) {
        return newState;
      }

      return this.handleDismissOldest(newState);
    });
  };

  render(): JSX.Element {
    const { contextValue } = this.state;
    const {
      maxSnack: dontspread1,
      preventDuplicate: dontspread2,
      variant: dontspread3,
      anchorOrigin: dontspread4,
      iconVariant,
      dense = DEFAULTS.dense,
      hideIconVariant = DEFAULTS.hideIconVariant,
      domRoot,
      children,
      classes = {},
      ...props
    } = this.props;

    const categ = this.state.snacks.reduce<SnacksByPosition>((acc, current) => {
      const category = originKeyExtractor(current.anchorOrigin);
      const existingOfCategory = acc[category] || [];
      return {
        ...acc,
        [category]: [...existingOfCategory, current]
      };
    }, {});

    const snackbars = Object.keys(categ).map((origin) => {
      const snacks = categ[origin];
      return (
        <SnackbarContainer
          key={origin}
          dense={dense}
          anchorOrigin={snacks[0].anchorOrigin}
          className={clsx(
            classes.containerRoot,
            classes[transformer.toContainerAnchorOrigin(origin)]
          )}
        >
          {snacks.map((snack) => (
            <SnackbarItem
              {...props}
              key={snack.key}
              snack={snack}
              dense={dense}
              iconVariant={iconVariant}
              hideIconVariant={hideIconVariant}
              classes={omitContainerKeys(classes)}
              onClose={this.handleCloseSnack}
              onExited={(node, key) => {
                this.handleExitedSnack(node, key);
                this.props.onExited?.(node, key);
              }}
              onEntered={(node, isAppearing, key) => {
                this.handleEnteredSnack(node, isAppearing, key);
                this.props.onEntered?.(node, isAppearing, key);
              }}
            />
          ))}
        </SnackbarContainer>
      );
    });

    return (
      <SnackbarContext.Provider value={contextValue}>
        {children}
        {domRoot ? createPortal(snackbars, domRoot) : snackbars}
      </SnackbarContext.Provider>
    );
  }
}
