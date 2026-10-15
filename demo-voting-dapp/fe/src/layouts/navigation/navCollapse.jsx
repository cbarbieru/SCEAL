import {useLocation} from 'react-router-dom';
import {useEffect, useState} from 'react';

import {alpha, useTheme} from '@mui/material/styles';
import {ArrowDropDown, ArrowDropUp} from '@mui/icons-material';
import {Box, Collapse, List, ListItemButton, Typography} from '@mui/material';
import NavItem from './navItem';

import PropTypes from 'prop-types';

const NavCollapse = ({ menu, level }) => {
    const theme = useTheme();

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    const handleClick = () => {
        setOpen(!open);
        setSelected(!selected ? menu.id : null);
    };

    const { pathname } = useLocation();
    const checkOpenForParent = (child, id) => {
        child.forEach((item) => {
            if (item.path?.replace(/ /g,"%20") === pathname) {
                setOpen(true);
                setSelected(id);
                return true;
            }

            if (item.children?.length) {
                checkOpenForParent(item.children, id);
            }
        });
    };

    useEffect(() => {
        setOpen(false);
        setSelected(null);
        if (menu.children) {
            checkOpenForParent(menu.children, menu.id);
        }

    }, [pathname, menu.children]);

    const menus = menu.children?.map((item) => {
        switch (item.type) {
            case 'collapse':
                return <NavCollapse key={item.id} menu={item} level={level + 1} />;
            case 'item':
                return <NavItem key={item.id} item={item} level={level + 1}/>;
            default:
                return (
                    <Typography key={item.id} variant="h6" color="error" align="center">
                        Menu Items Error
                    </Typography>
                );
        }
    });

    return (
        <>
            <ListItemButton
                sx={{
                    minHeight: 44,
                    borderRadius: 0.75,
                    typography: 'body2',
                    color: 'text.secondary',
                    textTransform: 'capitalize',
                    fontWeight: 'fontWeightMedium',
                    pl: `${level * 5}px`,
                    fontSize: 14 - level + 1,
                    ml:0,
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.15),
                    },
                    ...(selected && {
                        color: 'primary.main',
                        fontWeight: 'fontWeightSemiBold',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.10),
                        '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.3),
                        },
                    }),
                }}
                selected={selected === menu.id}
                onClick={handleClick}
            >
                <Box component="span" sx={{ width: 24, height: 24, mr: 2 }}>
                    {menu.icon}
                </Box>

                <Box component="span">{menu.title} </Box>
                {open ? (
                    <ArrowDropUp stroke={1.5} size="1rem" style={{ marginTop: 'auto', marginBottom: 'auto' }} />
                ) : (
                    <ArrowDropDown stroke={1.5} size="1rem" style={{ marginTop: 'auto', marginBottom: 'auto' }} />
                )}
            </ListItemButton>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <List
                    component="div"
                    disablePadding
                    sx={{
                        position: 'relative',
                        '&:after': {
                            content: "''",
                            position: 'absolute',
                            left: '32px',
                            top: 0,
                            height: '100%',
                            width: '1px',
                            opacity: 1,
                            background: theme.palette.primary.light
                        }
                    }}
                >
                    {menus}
                </List>
            </Collapse>
        </>
    );
};

NavCollapse.propTypes = {
    menu: PropTypes.object,
    level: PropTypes.number
};

export default NavCollapse;