import * as React from 'react';

declare module 'react-router-dom' {
  // Route components
  export interface RouteProps {
    caseSensitive?: boolean;
    children?: React.ReactNode;
    element?: React.ReactNode | null;
    index?: boolean;
    path?: string;
  }

  export function Route(props: RouteProps): React.ReactElement | null;

  export interface RoutesProps {
    children?: React.ReactNode;
    location?: any;
  }

  export function Routes(props: RoutesProps): React.ReactElement;

  // Navigation components and hooks
  export interface NavigateProps {
    to: string;
    replace?: boolean;
    state?: any;
  }
  
  export function Navigate(props: NavigateProps): React.ReactElement | null;

  export interface NavigateFunction {
    (to: string, options?: { replace?: boolean; state?: any }): void;
    (delta: number): void;
  }

  export function useNavigate(): NavigateFunction;
  export function useLocation(): any;
  export function useParams<T extends { [K in keyof T]?: string } = {}>(): T;
  export function useSearchParams(): [URLSearchParams, (searchParams: URLSearchParams) => void];

  // Other exports
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    replace?: boolean;
    state?: any;
  }

  export const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export const NavLink: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export const Outlet: React.FC;
} 