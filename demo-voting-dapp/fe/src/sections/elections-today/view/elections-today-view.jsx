import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from "@mui/material/Card";
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { alpha, styled, useTheme } from "@mui/material/styles";

import VoteService from "src/services/vote.service";
import { useRouter } from "../../../routes/hooks";
import AuthService from "../../../services/auth.service";
import ElectionService from "src/services/election.service";
import Tooltip from "@mui/material/Tooltip";
import { camelToFlat } from 'src/utils/format-text';
import { useState,useEffect } from "react";
import { LinearProgress } from "@mui/material";

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

export default function ElectionsTodayView({ electionId, showPopupMessage }) {
  const router = useRouter()
  const [revealVotesIsLoading, setRevealVotesLoading] = useState(false);
  const [revealVotesSuccess, setRevealVotesSuccess] = useState(false);
  const [election, setElection] = useState({type:"", candidates: []});

  useEffect(() => {
      ElectionService.electionById(electionId).then(setElection);
  }, [])

  const { palette, breakpoints } = useTheme();
  const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const userLoggedIn = AuthService.isUserLoggedIn();

  var isAdmin = false;

  if (userLoggedIn) {
    isAdmin = AuthService.isAdmin();
  }

  const logoutAndRefresh = () => {
    AuthService.logout().then(() => router.push("/"));
  }

  const error = (error) => {
    if (error.response.status === 401) {
      showPopupMessage("Your session expired, you will be logged out in 3 seconds!", 3000);
      setTimeout(logoutAndRefresh, 3000);
    } else if (error.response.status === 403) {
      showPopupMessage("You have already voted for this election!", 3000);
    } else {
      showPopupMessage("An error occurred, please try again or contact the owner.", 3000);
    }
  }

  const voteCandidate = (candidate_id) => {
    return VoteService.electionVote(election._id, candidate_id).then(() => router.push('/votes'), error);
  };

  const revealVotes = () => {
    return VoteService.revealVotes(election._id).then(() => console.log('revealed!'));
  }

  const getCandidateById = (candidateId) => {
    return election.candidates.find(candidate => candidate._id === candidateId);
  }

  const votedCandidate = ((candidate) => (
    <div>
      <Grid item xs={12} sm={12} md={12} key={candidate._id} width="100%">
        <Card
          component={Stack}
          spacing={1}
          direction="row"
          sx={{
            px: 2,
            py: 4,
            borderRadius: 1.5,
            height: "100%",
            justifyContent: "space-between",
            mt: 0,
            boxShadow: "rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 8px 8px 8px",
            border: "1px dashed red",
            '&:hover': {
              transform: "scale(1.02)",
              border: "1.5px solid",
              borderColor: "red"
            }
          }}>

          <Stack spacing={0.5}
            sx={{ justifyContent: 'space-between', pl: 1, width: "calc(100% - 580px)" }}>
            <div style={{ marginBottom: "10px" }}>
              <Item>
                <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                  Name:
                </Typography>
                <Typography variant="button" fontWeight="bold" color="black">
                  &nbsp;{candidate.name}
                </Typography>
              </Item>
              <Item>
                <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                  Political party:
                </Typography>
                <Typography variant="button" fontWeight="bold" color="black">
                  &nbsp;{candidate.party}
                </Typography>
              </Item>
              <Item>
                <Typography variant="button" fontWeight="bold">
                  Find out more about this candidate's political party by clicking  &nbsp;
                  <Link href={candidate.partyUrl} underline="hover" target="_blank"
                    rel="noopener">here</Link>
                </Typography>
              </Item>
              <Item>
                <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                  Born:
                </Typography>
                <Typography
                  variant="button">&nbsp;{new Date(candidate.born).toLocaleDateString("ro", options)}&nbsp;({candidate.age} years
                  old)</Typography>
              </Item>
              <Item>
                <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                  Profession:
                </Typography>
                <Typography variant="button" fontWeight="bold">
                  &nbsp;{candidate.profession}
                </Typography>
              </Item>
              <Item>
                <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                  Studies:
                </Typography>
                <Typography variant="button" fontWeight="bold">
                  &nbsp;{candidate.studies}
                </Typography>
              </Item>
              {
                candidate.candidatedBefore === "yes" && <>
                  <Item>
                    <Typography variant="button" fontWeight="bold">
                      Candidated before on:
                    </Typography>
                    <Typography variant="button" fontWeight="bold">
                      &nbsp;{candidate.candidatedOn}
                    </Typography>
                  </Item>
                </>
              }
            </div>
          </Stack>
          <Box style={{ width: "300px", height: "300px" }}>
            <img alt="icon" src={"/assets/images/vote-stamp.png"}
              style={{
                maxWidth: "300px",
                maxHeight: "300px",
                width: "auto",
                height: "auto"
              }} />
            {
              election.revealed &&
              <span>
                <Typography variant="h6" marginBottom={5} sx={{ display: "inline", color: alpha("#DE0C17", 0.9) }}>
                  This candidate had obtained <b>{candidate.percentage}</b>% of the votes
                </Typography>
              </span>
            }
          </Box>

          <Box style={{ width: "280px", height: "290px" }}>
            {<img alt="icon" src={`/assets/images/candidates/${candidate._id}.jpg`}
              style={{
                maxWidth: "280px",
                maxHeight: "290px",
                width: "auto",
                height: "auto"
              }} />}
          </Box>
        </Card>
      </Grid>

    </div>
  ));

  const candidateCard = (candidate, userVotedOnThisCandidate) => (
    <Grid item xs={12} sm={12} md={10} key={candidate._id} width="100%">
      <Card
        component={Stack}
        spacing={1}
        direction="row"
        sx={{
          px: 2,
          py: 4,
          borderRadius: 1.5,
          height: "100%",
          justifyContent: "space-between",
          mt: 0,
          boxShadow: "rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 8px 8px 8px",
          '&:hover': {
            transform: "scale(1.02)",
            border: "1.5px solid",
            borderColor: alpha(palette.grey[400], 1)
          }
        }}>

        <Stack spacing={0.5}
          sx={{ justifyContent: 'space-between', pl: 1, width: "calc(100% - " + (userVotedOnThisCandidate ? "580px" : "280px") + ")" }}>
          <div style={{ marginBottom: "10px" }}>
            <Item>
              <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                Name:
              </Typography>
              <Typography variant="button" fontWeight="bold" color="black">
                &nbsp;{candidate.name}
              </Typography>
            </Item>
            <Item>
              <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                Political party:
              </Typography>
              <Typography variant="button" fontWeight="bold" color="black">
                &nbsp;{candidate.party}
              </Typography>
            </Item>
            <Item>
              <Typography variant="button" fontWeight="bold">
                Find out more about this candidate's political party by clicking  &nbsp;
                <Link href={candidate.partyUrl} underline="hover" target="_blank"
                  rel="noopener">here</Link>
              </Typography>
            </Item>
            <Item>
              <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                Born:
              </Typography>
              <Typography
                variant="button">&nbsp;{new Date(candidate.born).toLocaleDateString("ro", options)}&nbsp;({candidate.age} years
                old)</Typography>
            </Item>
            <Item>
              <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                Profession:
              </Typography>
              <Typography variant="button" fontWeight="bold">
                &nbsp;{candidate.profession}
              </Typography>
            </Item>
            <Item>
              <Typography variant="button" fontWeight="bold" textTransform="capitalize">
                Studies:
              </Typography>
              <Typography variant="button" fontWeight="bold">
                &nbsp;{candidate.studies}
              </Typography>
            </Item>
            {
              candidate.candidatedBefore === "yes" && <>
                <Item>
                  <Typography variant="button" fontWeight="bold">
                    Candidated before on:
                  </Typography>
                  <Typography variant="button" fontWeight="bold">
                    &nbsp;{candidate.candidatedOn}
                  </Typography>
                </Item>
              </>
            }
          </div>
          {!isAdmin && !election.candidateIdVoted && !election.revealed &&
            <Tooltip title={!userLoggedIn ? "Please login in order to vote!" : ""}>
              <span>
                <Button disabled={!userLoggedIn || election.candidateIdVoted}
                  onClick={() => voteCandidate(candidate._id)}
                  size="large"
                  variant="contained" sx={{
                    [breakpoints.down("xl")]: {
                      width: "60%",
                    },
                    [breakpoints.up("xl")]: {
                      width: "50%",
                    },
                    pt: 2,
                    pb: 2,
                    backgroundColor: alpha("#ff0000", 0.7),
                    '&:hover': { backgroundColor: alpha("#ff0000", 0.9) }
                  }}>
                  Vote for this candidate
                </Button>
              </span>
            </Tooltip>
          }
          {
            election.revealed &&
            <span>
              <Typography variant="h6" marginBottom={5} sx={{ display: "inline", color: alpha("#DE0C17", 0.9) }}>
                This candidate had obtained <b>{candidate.percentage}</b>% of the votes
              </Typography>
            </span>
          }
        </Stack>
        {userVotedOnThisCandidate && <Box style={{ width: "300px", height: "300px" }}>
          <img alt="icon" src={"/assets/images/vote-stamp.png"}
            style={{
              maxWidth: "300px",
              maxHeight: "300px",
              width: "auto",
              height: "auto"
            }} />
        </Box>
        }
        <Box style={{ width: "280px", height: "290px" }}>
          {<img alt="icon" src={`/assets/images/candidates/${candidate._id}.jpg`}
            style={{
              maxWidth: "280px",
              maxHeight: "290px",
              width: "auto",
              height: "auto"
            }} />}
        </Box>
      </Card>
    </Grid>
  );

  return (
    <Container maxWidth="xl">
      <Grid item xs={12} marginBottom={5}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>

          <div style={{ width: '60%' }}>
            <Typography variant="h4" marginBottom={5}
              sx={{ display: "inline", color: alpha(palette.grey[700], 0.8) }}>
              Elections Today, {new Date().toLocaleDateString("ro", options)}:
            </Typography>
            <Typography variant="h4" textTransform="capitalize" sx={{
              display: "inline",
              color: alpha(palette.grey[800], 1)
            }}> {camelToFlat(election.type) + " Elections" + (election.round === 2 ? ", second round " : " ")}</Typography>
          </div>
          {
            userLoggedIn && isAdmin &&
            <div style={{ width: '40%' }}>
              {!revealVotesIsLoading ?
                (revealVotesSuccess || election.revealed) ?
                  <Typography variant="h5" marginBottom={5} sx={{ display: "inline", color: alpha("#DE0C17", 0.9) }}>The votes for this election are revealed!</Typography>
                  : <Button disabled={revealVotesIsLoading}
                    onClick={() => {
                      setRevealVotesSuccess(false);
                      setRevealVotesLoading(true);
                      return revealVotes().then(() => {
                        setRevealVotesSuccess(true);
                        setRevealVotesLoading(false);
                        ElectionService.electionById(electionId).then(setElection);
                        //ElectionService.electionById(election._id).then(result=>election=result);
                      }, () => {
                        setRevealVotesLoading(false);
                      });
                    }}
                    size="large"
                    variant="contained" sx={{
                      [breakpoints.down("xl")]: {
                        width: "60%",
                      },
                      [breakpoints.up("xl")]: {
                        width: "50%",
                      },
                      pt: 2,
                      pb: 2,
                      backgroundColor: alpha("#ff0000", 0.7),
                      '&:hover': { backgroundColor: alpha("#ff0000", 0.9) }
                    }}>
                    Reveal the votes
                  </Button> :
                <Box>
                  <Typography variant="h6">Revealing in progress</Typography>
                  <LinearProgress />
                </Box>
              }
            </div>
          }
          {
            !isAdmin && election.revealed && <Typography variant="h5" marginBottom={5} sx={{ display: "inline", color: alpha("#DE0C17", 0.9) }}>(closed)</Typography>
          }
        </div>
      </Grid>

      {election.candidateIdVoted && <>
        <Typography variant="h4" marginBottom={5}
          sx={{ display: "inline", color: alpha("#DE0C17", 0.9) }}>
          You voted for this candidate:
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4, mt: 1 }} style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column'
        }}>
          {votedCandidate(getCandidateById(election.candidateIdVoted))}
        </Grid>
      </>
      }

      {election.candidates.length !== 0 && <>
        <Typography variant="h5" marginBottom={5} marginTop={2} sx={{ color: alpha(palette.grey[700], 0.8) }}>
          {election.candidateIdVoted ? "The other candidates:" : "Candidates:"}
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }} style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column'
        }}>
          {election.candidates.filter(candidate => candidate._id !== election.candidateIdVoted)
            .map(candidate => candidateCard(candidate, false))
          }
        </Grid>
      </>
      }
    </Container>
  );
}