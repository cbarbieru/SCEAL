import { useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';
import { useTheme } from '@mui/material/styles';
import { useResponsive } from 'src/hooks/use-responsive';

import Logo from 'src/components/logo';
import Scrollbar from 'src/components/scrollbar';
import AuthService from "src/services/auth.service";

import { NAV } from '../dashboard/config-layout';
import NavItem from './navItem';
import NavCollapse from './navCollapse';
import createMenuItems from './menuItems';

export default function Nav({ openNav, onCloseNav, elections }) {
    const theme = useTheme();

    const pathname = usePathname();

    const upLg = useResponsive('up', 'lg');

    useEffect(() => {
        if (openNav) {
            onCloseNav();
        }

    }, [pathname]);

    var isAdmin = false;

    const isUserLoggedIn = AuthService.isUserLoggedIn();

    if (isUserLoggedIn) {
        isAdmin = AuthService.isAdmin();
    }

    const allMenuItems = createMenuItems(elections);

    const renderMenu = (
        <Stack component="nav" spacing={1.5} sx={{ px: 2, pt: 6 }}>
            {
                allMenuItems.map((menu) => {
                    var shouldBeShown = (menu.mustBeLoggedIn && isUserLoggedIn) || menu.neutral || (menu.mustBeLoggedOut && !isUserLoggedIn) || 
                    (menu.mustBeLoggedInAndUser && isUserLoggedIn && !isAdmin);

                    if (shouldBeShown) {
                        switch (menu.type) {
                            case 'collapse':
                                return <NavCollapse key={menu.id} menu={menu} level={1} />;
                            case 'item':
                                return <NavItem key={menu.id} item={menu} level={1} />;
                            default:
                                return (
                                    <Typography key={menu.id} variant="h6" color="error" align="center">
                                        Menu Items Error
                                    </Typography>
                                );
                        }
                    }
                })
            }
        </Stack>
    );

    const renderContent = (
        <Scrollbar
            sx={{
                height: 1,
                '& .simplebar-content': {
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Logo sx={{ mt: 3, ml: 4 }} />

            {renderMenu}

            <Box sx={{ flexGrow: 1 }} />
        </Scrollbar>
    );

    return (
        <Box
            sx={{
                flexShrink: { lg: 0 },
                width: { lg: NAV.WIDTH },
            }}
            bgcolor={theme.palette.grey[0]}
        >
            {upLg ? (
                <Box
                    sx={{
                        height: 1,
                        position: 'fixed',
                        width: NAV.WIDTH
                    }}
                >
                    {renderContent}
                </Box>
            ) : (
                <Drawer
                    open={openNav}
                    onClose={onCloseNav}
                    PaperProps={{
                        sx: {
                            width: NAV.WIDTH,
                        },
                    }}
                >
                    {renderContent}
                </Drawer>
            )}
        </Box>
    );
}

Nav.propTypes = {
    openNav: PropTypes.bool,
    onCloseNav: PropTypes.func,
};