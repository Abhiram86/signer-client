import getCookie from "./getCookie";

function isAuthenticated() {
  return !!getCookie("sessionToken");
}

export default isAuthenticated;
