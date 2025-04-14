declare module 'react' {
  export = React;
  export as namespace React;
}

declare module '@mui/material' {
  export * from '@mui/material';
}

declare module '@mui/icons-material' {
  export * from '@mui/icons-material';
}

declare module 'react-router-dom' {
  export * from 'react-router-dom';
}

interface AutocompleteProps<T> {
  value: T;
  onChange: (event: React.SyntheticEvent, value: T | null) => void;
  options: T[];
  freeSolo?: boolean;
  fullWidth?: boolean;
  renderInput: (params: AutocompleteRenderInputParams) => React.ReactNode;
}

interface AutocompleteRenderInputParams {
  InputLabelProps?: object;
  InputProps?: {
    ref?: React.Ref<any>;
    className?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
  };
  inputProps?: {
    ref?: React.Ref<any>;
    className?: string;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
  ref?: React.Ref<any>;
} 