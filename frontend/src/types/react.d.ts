import * as React from 'react';

declare module 'react' {
  // Define the FC type correctly
  export interface FunctionComponent<P = {}> {
    (props: P, context?: any): React.ReactElement<any, any> | null;
    propTypes?: React.WeakValidationMap<P>;
    contextTypes?: React.ValidationMap<any>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  export interface FC<P = {}> extends React.FunctionComponent<P> {}

  export interface ComponentClass<P = {}, S = {}> extends React.StaticLifecycle<P, S> {
    new (props: P, context?: any): React.Component<P, S>;
    propTypes?: React.WeakValidationMap<P>;
    contextType?: React.Context<any>;
    contextTypes?: React.ValidationMap<any>;
    childContextTypes?: React.ValidationMap<any>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };

  export type MouseEvent<T = Element> = React.MouseEvent<T>;
  export type FormEvent<T = Element> = React.FormEvent<T>;
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
  export type FocusEvent<T = Element> = React.FocusEvent<T>;
  
  export type ReactNode = React.ReactNode;
  export type ReactElement<P = any, T extends React.ElementType = React.ElementType> = React.ReactElement<P, T>;
  export type RefObject<T> = React.RefObject<T>;
  export type MutableRefObject<T> = React.MutableRefObject<T>;
  export type Dispatch<A> = React.Dispatch<A>;
  export type SetStateAction<S> = React.SetStateAction<S>;
  export type SyntheticEvent<T = Element> = React.SyntheticEvent<T>;
  
  // Export hooks
  export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
  export function useRef<T>(initialValue: T): React.MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): React.RefObject<T>;
  export function useContext<T>(context: React.Context<T>): T;
  export function useReducer<R extends React.Reducer<any, any>, I>(
    reducer: R,
    initializerArg: I,
    initializer?: (arg: I) => React.ReducerState<R>
  ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
  
  export const Suspense: React.ComponentType<React.SuspenseProps>;
  export const StrictMode: React.ComponentType<React.StrictModeProps>;
  
  export function lazy<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>
  ): T;
}

// Add missing types from @types/react
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
  }
}

export function createContext<T>(defaultValue: T): React.Context<T>;
export function useContext<T>(context: React.Context<T>): T;
export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>];
export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
export function useRef<T>(initialValue: T): React.MutableRefObject<T>;
export function useRef<T>(initialValue: T | null): React.RefObject<T>;
export function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer?: (arg: I) => React.ReducerState<R>
): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];

export function lazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): T; 