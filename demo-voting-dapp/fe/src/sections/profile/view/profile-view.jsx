import Typography from '@mui/material/Typography';
import { styled, useTheme, alpha } from "@mui/material/styles";
import AuthService from "src/services/auth.service";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";

// ----------------------------------------------------------------------
const Item = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'left',
    color: theme.palette.text.secondary,
    display: 'flex',
    py: 1,
    pr: 2
}));

export default function UserPage() {
    const currentUser = AuthService.getCurrentUser();
    const theme = useTheme();

    return (
        <Card sx={{ pt: 2, pl: 2, pb:2, mt: 2, ml: 3, mr: 3 }}>
            <Typography variant="h4" marginLeft={1} marginBottom={5} sx={{ color: alpha(theme.palette.primary.main, 0.8) }}>Your Profile</Typography>
            <Box>
                <Item>
                    <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                        Personal Identification Number: &nbsp;
                    </Typography>
                    <Typography variant="button" fontWeight="bold" color="black">
                        &nbsp;{currentUser.pin}
                    </Typography>
                </Item><Item>
                    <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                        Name: &nbsp;
                    </Typography>
                    <Typography variant="button" fontWeight="bold" color="black" textTransform="capitalize">
                        &nbsp;{currentUser.name}
                    </Typography>
                </Item>
                <Item>
                    <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                        Email: &nbsp;
                    </Typography>
                    <Typography variant="button" fontWeight="bold" color="text">
                        &nbsp;{currentUser.email}
                    </Typography>
                </Item>
                <Item>
                    <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                        City: &nbsp;
                    </Typography>
                    <Typography variant="button" fontWeight="bold" color="text">
                        &nbsp;{currentUser.city}
                    </Typography>
                </Item>
                <Item>
                    <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                        Region: &nbsp;
                    </Typography>
                    <Typography variant="button" fontWeight="bold" color="text">
                        &nbsp;{currentUser.region}
                    </Typography>
                </Item>
            </Box>
        </Card>
    );
}