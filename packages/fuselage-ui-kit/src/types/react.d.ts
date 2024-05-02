import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface AllHTMLAttributes<T> {
    // FIXME: workaround for https://github.com/facebook/react/issues/17883
    onPointerEnterCapture?: unknown;
    onPointerLeaveCapture?: unknown;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
  interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }, context?: any): ReactNode;
  }
}
