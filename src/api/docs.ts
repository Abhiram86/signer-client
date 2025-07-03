import axios, { AxiosError } from "axios";

const docs = axios.create({
  baseURL: "http://localhost:8080/docs",
  withCredentials: true,
});

export interface Doc {
  _id: string;
  userId: string;
  fileName: string;
  file: {
    data: any;
    contentType: string;
  };
  uploadTime: Date;
}

export const getFiles = async (userId: string) => {
  try {
    const res = await docs.get("/", { params: { userId } });
    console.log("res is ", res);
    return { docs: res.data.docs as Doc[], error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { docs: null, error: errorMessage };
  }
};
interface DocsUploadType {
  formData: FormData;
}

export const docsUpload = async (data: DocsUploadType) => {
  try {
    const res = await docs.post("/upload", data.formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("res is ", res);
    return { message: res.data.message, error: null };
  } catch (error) {
    let errorMessage = "An error occurred";
    if (error instanceof AxiosError) {
      console.log("error is ", error.message);
      errorMessage = error.response?.data?.error || error.message;
    } else {
      console.log(error);
    }
    return { message: null, error: errorMessage };
  }
};
