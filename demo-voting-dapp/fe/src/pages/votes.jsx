import { Helmet } from 'react-helmet-async';

import { VotesView } from 'src/sections/votes/view';

// ----------------------------------------------------------------------

export default function VotesPage({ showPopupMessage }) {
  return (
    <>
      <Helmet>
        <title>Your Votes | Online Voting </title>
      </Helmet>

      <VotesView showPopupMessage={showPopupMessage}/>
    </>
  );
}
