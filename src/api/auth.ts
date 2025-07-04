import type { User } from "@/context/AuthProvider";
import axios, { AxiosError } from "axios";

const auth = axios.create({
  baseURL:
    "https://signer-server-dnk4pcule-abhirams-projects-d301feec.vercel.app/auth",
  withCredentials: true,
});

interface RegisterUser {
  username: string;
  email: string;
  password: string;
}

export const registerUser = async (data: RegisterUser) => {
  try {
    const res = await auth.post("/register", data);
    console.log("res is ", res);
    return { user: res.data.user as User, error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { user: null, error: errorMessage };
  }
};

export const loginUser = async (data: Omit<RegisterUser, "username">) => {
  try {
    const res = await auth.post("/login", data);
    console.log("res is ", res);
    return { user: res.data.user as User, error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { user: null, error: errorMessage };
  }
};

export const getUser = async () => {
  try {
    const res = await auth.get("/getUser");
    console.log("res is ", res);
    return { user: res.data.user as User, error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { user: null, error: errorMessage };
  }
};

export const logoutUser = async () => {
  try {
    const res = await auth.post("/logout", {});
    console.log("res is ", res);
    return { error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { error: errorMessage };
  }
};
