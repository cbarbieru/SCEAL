import {Box} from '@mui/material';
import {useState} from 'react';

import Popover from '@mui/material/Popover';

import Divider from '@mui/material/Divider';

import {alpha} from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Iconify from 'src/components/iconify';
import { useTheme } from '@mui/material/styles';

import AuthService from "src/services/auth.service";
import {useRouter} from 'src/routes/hooks';

// ----------------------------------------------------------------------

const MENU_OPTIONS = [
    {
        label: 'Profile',
        icon: 'eva:person-fill',
        page: '/profile'
    },
];

// ----------------------------------------------------------------------

export default function AccountPopover({showPopupMessage}) {
    const [open, setOpen] = useState(null);
    const currentUser = AuthService.getCurrentUser();
    const theme = useTheme();

    const router = useRouter();

    const handleOpen = (event) => {
        setOpen(event.currentTarget);
    };

    const handleClose = (page) => {
        setOpen(null);
        if (page) {
            router.push(page);
        }
    };

    const handleLogout = async () => {
        setOpen(false);
        showPopupMessage("You will be logged out in 3 seconds", 3000);
        setTimeout(async () => {
            await AuthService.logout();
            router.reload();

        }, 3000);
    };

    
    return !!currentUser && (
        <>
            <IconButton
                onClick={handleOpen}
                sx={{
                    width: 50,
                    height: 50,
                    background: (theme) => alpha(theme.palette.grey[500], 0.09),
                    ...(open && {
                        background: (theme) =>
                            `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                    }),
                }}
            >
                 <Iconify icon={'eva:settings-2-fill'} color={theme.palette.primary.dark} />
            </IconButton>

            <Popover
                open={!!open}
                anchorEl={open}
                onClose={handleClose}
                anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                transformOrigin={{vertical: 'top', horizontal: 'right'}}
                paper={{
                    sx: {
                        p: 0,
                        mt: 1,
                        ml: 0.75,
                        width: 200,
                    },
                }}
            >
                <Box sx={{my: 1.5, px: 2}}>
                    <Typography variant="subtitle2" noWrap>
                        {currentUser.name}
                    </Typography>
                    <Typography variant="body2" sx={{color: 'text.secondary'}} noWrap>
                        {currentUser.email}
                    </Typography>
                </Box>

                <Divider sx={{borderStyle: 'dashed'}}/>

                {MENU_OPTIONS.map((option) => (
                    <MenuItem key={option.label} onClick={() => handleClose(option.page)}>
                        {option.label}
                    </MenuItem>
                ))}

                <Divider sx={{borderStyle: 'dashed', m: 0}}/>

                <MenuItem
                    disableRipple
                    disableTouchRipple
                    onClick={handleLogout}
                    sx={{typography: 'body2', color: 'error.main', py: 1.5}}
                >
                    Logout
                </MenuItem>
            </Popover>
        </>
    );
}
