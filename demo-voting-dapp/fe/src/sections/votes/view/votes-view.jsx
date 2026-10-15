import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import VoteService from "src/services/vote.service";
import AuthService from "src/services/auth.service";
import { useEffect, useState } from "react";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { camelToFlat } from 'src/utils/format-text';
import { useRouter } from "../../../routes/hooks";


export default function VotesPage({ showPopupMessage }) {
    const [votes, setVotes] = useState([]);

    const router = useRouter();
    const voteYearOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const voteTimeOptions = { hour: "numeric", minute: "numeric" };

    const logoutAndRefresh = () => {
        AuthService.logout().then(() => router.push("/"));
    }

    const error = (error) => {
        if (error.response.status === 401) {
            showPopupMessage("Your session expired, you will be logged out in 3 seconds!", 3000);
            setTimeout(logoutAndRefresh, 3000);
        } else {
            showPopupMessage("An error occurred, please try again or contact the owner.", 3000);
        }
    }

    useEffect(() => {
        VoteService.getVotes().then(setVotes, error);
    }, [])

    return (
        <Card sx={{ pt: 2, pl: 2, mt: 2, ml: 3, mr: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Typography variant="h4">Your votes so far</Typography>
            </Stack>

            {votes !== null && votes.length !== 0 ?
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow sx={{ '&>th': { fontWeight: "bold!important" } }}>
                                <TableCell>Voted On</TableCell>
                                <TableCell>Voted At</TableCell>
                                <TableCell>Election</TableCell>
                                <TableCell>Candidate Voted</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {votes.map((row) => (
                                <TableRow
                                    key={row._id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">
                                        {new Date(row.date).toLocaleDateString("ro", voteYearOptions)}
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {new Date(row.date).toLocaleTimeString("ro", voteTimeOptions)}
                                    </TableCell>
                                    <TableCell>{camelToFlat(row.election.type) + " Elections" + (row.election.round == 2 ? " Second Round" : "")}</TableCell>
                                    <TableCell>{row.candidateVoted.name}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer> : <h4>You did not vote on any elections yet!</h4>
            }
        </Card>
    );
}