import { Helmet } from 'react-helmet-async';

import { AppView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function AppPage({ elections }) {
  return (
    <>
      <Helmet>
        <title> Dashboard | Online Voting </title>
      </Helmet>

      <AppView elections={elections}/>
    </>
  );
}
