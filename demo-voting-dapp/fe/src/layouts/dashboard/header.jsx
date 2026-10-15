import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useTheme, darken } from '@mui/material/styles';

import { useResponsive } from 'src/hooks/use-responsive';

import { bgBlur } from 'src/theme/css';

import Iconify from 'src/components/iconify';

import { NAV, HEADER } from './config-layout';
import AccountPopover from './common/account-popover';

import AuthService from "src/services/auth.service";

export default function Header({ onOpenNav, showPopupMessage }) {
  const theme = useTheme();
  const lgUp = useResponsive('up', 'lg');
  const currentUser = AuthService.getCurrentUser();

  const renderAccount = !!currentUser && (
    <div>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: darken(theme.palette.secondary.dark, 0.16), mr: 2, }}>
        {currentUser.name}
      </Typography>

      {/* <Typography variant="body2" sx={{color: 'text.secondary'}}>
                {currentUser.roles[0]}
            </Typography> */}
    </div>
  );

  const renderContent = (
    <>
      {!lgUp && (
        <IconButton onClick={onOpenNav} sx={{ mr: 1 }}>
          <Iconify icon="eva:menu-2-fill" />
        </IconButton>
      )}

      <Typography variant="h4" sx={{ fontWeight: 'bold', color: darken(theme.palette.primary.dark, 0.16) }}>
        Online Voting
      </Typography>


      <Box sx={{ flexGrow: 1 }} />

      <Stack direction="row" alignItems="center" spacing={1}>
        {/* <LanguagePopover />
        <NotificationsPopover /> */}
        {renderAccount}
        <AccountPopover showPopupMessage={showPopupMessage} />
      </Stack>
    </>
  );

  return (
    <AppBar
      sx={{
        boxShadow: 'none',
        height: HEADER.H_MOBILE,
        zIndex: theme.zIndex.appBar + 1,
        ...bgBlur({
          color: theme.palette.grey[0],
        }),
        transition: theme.transitions.create(['height'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...(lgUp && {
          width: `calc(100% - ${NAV.WIDTH}px)`,
          height: HEADER.H_DESKTOP,
        }),
      }}
    >
      <Toolbar
        sx={{
          height: 1,
          px: { lg: 2 },
        }}
      >
        {renderContent}
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  onOpenNav: PropTypes.func,
};
