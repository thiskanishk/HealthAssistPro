/// <reference types="react-scripts" />

// Fix for "React has no default export" issue
declare module 'react' {
  interface ReactElement {
    type: any;
    props: any;
    key: any;
  }
}

// Add any other custom type declarations here 