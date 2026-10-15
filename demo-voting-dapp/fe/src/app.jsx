import 'src/global.css';

import {useScrollToTop} from 'src/hooks/use-scroll-to-top';
import {useState, useEffect} from 'react';

import routes from 'src/routes/sections';
import ThemeProvider from 'src/theme';
import {useRoutes} from 'react-router-dom';
import AuthService from 'src/services/auth.service';
import ElectionService from 'src/services/election.service';
import Snackbar from "@mui/material/Snackbar";

// ----------------------------------------------------------------------

export default function App() {
  const defaultMessageAndDuration = {message: '', duration: 2000};
  const [popupMessageOpened, setPopupMessageOpened] = useState(false);
  const [popupMessageAndDuration, setPopupMessageAndDuration] = useState(defaultMessageAndDuration);

  const currentUser = AuthService.getCurrentUser();

  const [elections, setElections] = useState({ future: [], today: [] });
  
  useEffect(() => {
    ElectionService.getAllElections().then(setElections);
  }, [])

  useScrollToTop();
  const handleClose = () => {
    setPopupMessageOpened(false);
  };
  const showPopupMessage = (message, duration) => {
    setPopupMessageAndDuration({...defaultMessageAndDuration, message, duration});
    setPopupMessageOpened(true);
  }

  const routing = useRoutes(routes(currentUser, elections, showPopupMessage));

  return (
    <ThemeProvider>
      <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={popupMessageOpened}
          onClose={handleClose}
          autoHideDuration={popupMessageAndDuration.duration}
          message={popupMessageAndDuration.message}
      />
      {routing}
    </ThemeProvider>
  );
}
