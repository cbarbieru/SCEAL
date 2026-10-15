import { useMemo } from 'react';
import PropTypes from 'prop-types';

import CssBaseline from '@mui/material/CssBaseline';
import {ThemeProvider  as OnlineVotingThemeProvider} from '@mui/material/styles'
import { createTheme } from '@mui/material/styles';

import { palette } from './palette';
import { shadows } from './shadows';
import { overrides } from './overrides';
import { typography } from './typography';
import { customShadows } from './custom-shadows';

// ----------------------------------------------------------------------

export default function ThemeProvider({ children }) {
  const memoizedValue = useMemo(
    () => ({
      palette: palette(),
      typography,
      shadows: shadows(),
      customShadows: customShadows(),
      shape: { borderRadius: 8 },
    }),
    []
  );

  const theme = createTheme(memoizedValue);

  theme.components = overrides(theme);

  return (
    <OnlineVotingThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </OnlineVotingThemeProvider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
};
