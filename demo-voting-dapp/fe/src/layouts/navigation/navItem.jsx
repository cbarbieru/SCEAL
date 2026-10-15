import PropTypes from 'prop-types';


import { alpha } from '@mui/material/styles';

import { ListItemButton, Box } from '@mui/material';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

export default function NavItem({ item, level }) {
    const pathname = usePathname();

    const active = item.path?.replace(/ /g,"%20") === pathname;

    const additionalPadding = item.title.length > 50 ? item.title.length / 20 + 17 : 0;
    return (
        <ListItemButton
            component={RouterLink}
            href={item.path}
            sx={{
                minHeight: 44,
                borderRadius: 0.75,
                typography: 'body2',
                color: 'text.secondary',
                textTransform: 'capitalize',
                fontWeight: 'fontWeightMedium',
                pl: `${level * 5 + additionalPadding}px`,
                fontSize: 14 - level + 1,
                '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.15),
                },
                ...(active && {
                    color: 'primary.main',
                    fontWeight: 'fontWeightSemiBold',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.10),
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    },
                }),
            }}
        >
            <Box component="span" sx={{ width: 24, height: 24, mr: 2 }}>
                {item.icon}
            </Box>

            <Box component="span">{item.title} </Box>
        </ListItemButton>
    );
}

NavItem.propTypes = {
    item: PropTypes.object,
};