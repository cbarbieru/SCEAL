import axios from "axios";

const API_URL = "/api/auth/";

const register = (pin, email, password) => {
  return axios.post(API_URL + "signup", {
    pin,
    email,
    password,
  });
};

const login = async (pin, password) => {
  const response = await axios
    .post(API_URL + "signin", {
      pin,
      password,
    });
  if (response.data.pin) {
    localStorage.setItem("user", JSON.stringify(response.data));
  }
  return response.data;
};

const logout = async () => {
  localStorage.removeItem("user");
  const response = await axios.post(API_URL + "signout");
  return response.data;
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

const isAdmin = () => {
  const currentUser = getCurrentUser();
  return currentUser.roles.includes("admin");
}

const isUserLoggedIn = () => {
  return getCurrentUser() !== null;
}

const AuthService = {
  register,
  login,
  logout,
  getCurrentUser,
  isUserLoggedIn,
  isAdmin
}

export default AuthService;