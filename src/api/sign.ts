import axios, { AxiosError } from "axios";

const sign = axios.create({
  baseURL: "http://localhost:8080/sign",
  withCredentials: true,
});

interface SignType {
  senderEmail: string;
  docId: string;
  email: string;
}

export const signLink = async (data: SignType) => {
  try {
    const res = await sign.post("/", data);
    if (res.status === 200) {
      return { error: null };
    }
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

interface SignFile {
  formdata: FormData;
}

export const signFile = async (data: SignFile) => {
  try {
    await sign.post("/file", data.formdata, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
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
