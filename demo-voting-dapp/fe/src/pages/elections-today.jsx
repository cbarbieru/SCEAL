import {Helmet} from 'react-helmet-async';
import {ElectionsTodayView} from 'src/sections/elections-today/view';
import {useParams} from "react-router-dom";

export default function ElectionsTodayPage({showPopupMessage}) {
    const {electionId} = useParams()

    return (
        <>
            <Helmet>
                <title> Elections Today | Online Voting </title>
            </Helmet>
            <ElectionsTodayView electionId={electionId} showPopupMessage={showPopupMessage}/>
        </>
    );
}