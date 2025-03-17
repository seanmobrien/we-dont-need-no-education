import '@mui/material';

declare module '@mui/material' {
  /*
  import { SvgIconTypeMap } from '@mui/material/SvgIcon';
  import { Theme as MuiTheme } from '@mui/material/styles';

  export * from '@mui/material';
  export { SvgIconTypeMap, MuiTheme };
  */
  export interface CheckboxProps {
    inputProps?: unknown;
  }
}
