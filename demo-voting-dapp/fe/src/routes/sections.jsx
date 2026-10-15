import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import DashboardLayout from 'src/layouts/dashboard';

export const IndexPage = lazy(() => import('src/pages/app'));
export const VotesPage = lazy(() => import('src/pages/votes'));
export const ProfilePage = lazy(() => import('src/pages/profile'));
export const LoginPage = lazy(() => import('src/pages/login'));
export const RegisterPage = lazy(() => import('src/pages/register'));
export const ElectionsToday = lazy(() => import('src/pages/elections-today'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

const routes = (currentUser, elections, showPopupMessage) => [
  {
    element: (
      <DashboardLayout showPopupMessage={showPopupMessage} elections={elections}>
        <Suspense>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    ),
    children: [
      { element: <IndexPage elections={elections} />, index: true },
      { path: 'votes', element: currentUser ? <VotesPage showPopupMessage={showPopupMessage}/> : <Navigate to="/login" /> },
      { path: 'profile', element: currentUser ? <ProfilePage /> : <Navigate to="/login" /> },
      { path: 'elections-today/:electionId', element: <ElectionsToday todayElections={elections.today} showPopupMessage={showPopupMessage}/> }
    ],
  },
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    path: 'register',
    element: <RegisterPage />
  },
  {
    path: '404',
    element: <Page404 />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
];

export default routes;
