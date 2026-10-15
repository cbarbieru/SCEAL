import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { useTheme,alpha } from '@mui/material/styles';

import Nav from '../navigation/nav';
import Main from './main';
import Header from './header';

// ----------------------------------------------------------------------

export default function DashboardLayout({ showPopupMessage, elections, children }) {
  const [openNav, setOpenNav] = useState(false);
  const theme=useTheme();

  return (
    <>
      <Header onOpenNav={() => setOpenNav(true)} showPopupMessage={showPopupMessage}/>

      <Box
        sx={{
          minHeight: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          backgroundColor:"white"
        }}
      >
        <Nav openNav={openNav} onCloseNav={() => setOpenNav(false)} showPopupMessage={showPopupMessage} elections={elections}/>

        <Main sx={{
          backgroundColor:alpha(theme.palette.primary.dark, 0.08),
          borderTopLeftRadius:"10px",
          borderTopRightRadius:"10px"}}>{children}</Main>
      </Box>
    </>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node,
};
