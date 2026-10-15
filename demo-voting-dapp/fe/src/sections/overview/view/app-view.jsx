import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { useRouter } from 'src/routes/hooks';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import AuthService from "src/services/auth.service";
import { camelToFlat } from 'src/utils/format-text';

export default function AppView({ elections }) {
  const router = useRouter();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const { palette, breakpoints } = useTheme();
  var isAdmin = false;

  const isUserLoggedIn = AuthService.isUserLoggedIn();
  if (isUserLoggedIn) {
    isAdmin = AuthService.isAdmin();
  }

  return (
    <Container maxWidth="xl">
      {/* {currentUser != null &&
        <Typography variant="h5" sx={{ mb: 5, mt: 0, pt: 0 }}>
          Hi, welcome back, {currentUser.name} 👋
        </Typography>
      } */}

      {elections.today.length !== 0 && <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ color: alpha(palette.secondary.dark, 1) }}>Today's elections</Typography>
        </Grid>

        {elections.today.map(election => (
          
          <Grid item xs={12} sm={6} md={5} key={election._id}>
            <Card
              component={Stack}
              spacing={3}
              direction="row"
              sx={{
                px: 2,
                py: 4,
                borderRadius: 1.5,
                height: "100%",
                mt: 0,
                boxShadow: "rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 8px 8px 8px",
                '&:hover': { transform: "scale(1.02)", bgcolor: alpha(palette.grey[100], 0.9), border: "1.5px solid", borderColor: alpha(palette.grey[400], 1) }
              }}
            >
              <Box sx={{ width: 55, height: 55 }}>
                {<img alt="icon" src="/assets/svg/flag-romania.svg" />}
              </Box>

              <Stack spacing={0.5} sx={{ justifyContent: 'space-between', pl: 2 }}>
                <Typography variant="h5">{new Date(election.date).toLocaleDateString("en-US", options)}</Typography>

                <Typography textTransform="capitalize" variant="subtitle1" fontWeight="bold" sx={{ color: palette.info.dark }}>
                  {camelToFlat(election.type) + " Elections" + (election.round == 2 ? " second round" : "")}
                </Typography>

                <div><h4 >Find out more about these  {camelToFlat(election.type) + " Elections" + (election.round == 2 ? " second round " : " ")}<Link href={elections.findOutMore[election.type]} underline="hover" target="_blank" rel="noopener">{"here"}</Link></h4>
                </div>
                <Button size="large" variant="contained" sx={{
                  [breakpoints.down("xl")]: {
                    width: "100%",
                  },
                  [breakpoints.up("xl")]: {
                    width: "80%",
                  },
                  backgroundColor: alpha(palette.secondary.main, 0.9),
                  '&:hover': { backgroundColor: alpha(palette.secondary.dark, 1) }
                }} onClick={() => { const route = "/elections-today/" + election._id; router.push(route); }}>
                  {!isAdmin && !election.revealed? "Check out the candidates" : isAdmin && !election.revealed ? "Reveal the votes" : "Check out the results"}
                </Button>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>}

      {elections.future.map.length !== 0 && <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} >
          <Typography variant="h6" color={'gray'}>Upcoming elections</Typography>
        </Grid>
        {elections.future.map(election => (
          <Grid item xs={12} sm={6} md={4} key={election._id}>
            <Card
              component={Stack}
              spacing={3}
              direction="row"
              sx={{
                px: 3,
                py: 4,
                borderRadius: 1.5,
                height: "100%",
                borderShadow: "box-shadow: rgba(33, 35, 38, 0.1) 0px 10px 10px -10px;",
                '&:hover': { transform: "scale(1.02)", bgcolor: alpha(palette.grey[100], 0.9), border: "1px solid", borderColor: alpha(palette.grey[400], 0.5) }
              }}
            >
              <Box sx={{ width: 45, height: 45 }}>
                {<img alt="icon" src="/assets/svg/flag.svg" />}
              </Box>

              <Stack spacing={0.5} sx={{ justifyContent: 'space-between', pl: 2 }}>
                <Typography variant="h5">{new Date(election.date).toLocaleDateString("en-US", options)}</Typography>

                <Typography variant="subtitle2" sx={{ color: 'text.disabled' }}>
                  {"Upcoming " + camelToFlat(election.type) + " Elections" + (election.round == 2 ? " second round " : " ")}
                </Typography>
                <div><h4 style={{ color: "grey" }} >Find out more about these {camelToFlat(election.type) + " elections" + (election.round == 2 ? " second round" : " ")} <Link href={elections.findOutMore[election.type]} underline="hover" target="_blank" rel="noopener">{"here"}</Link></h4>
                </div>
                {/* <Button size="large" variant="contained" sx={{
                  width: "80%",
                  backgroundColor: alpha("#1877F2", 0.8)
                }}>
                  Send me a reminder
                </Button> */}
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>
      }
    </Container>
  );
}
