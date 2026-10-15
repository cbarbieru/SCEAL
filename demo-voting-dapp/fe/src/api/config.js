// Relative, so calls go through the Vite /api proxy (dev and preview, see vite.config.js)
// and also work when the frontend runs in the cluster.
const backEndBaseUrl = '';
const config = {
    paths: {
        login: "/api/auth/signin",
        logout: "/api/auth/signout",
        register: "/api/auth/signup",
        isLoggedIn: "/api/user/loggedIn",
        accountDetails: "/api/user/accountDetails"
    },
    api: (path) => {
        return backEndBaseUrl + path;
    },
};

export default config;