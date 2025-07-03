import { registerUser } from "@/api/auth";
import { Button } from "@/components/Button";
import { AuthContext } from "@/context/AuthProvider";
import isAuthenticated from "@/utils/isAuthenticated";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useContext } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const Route = createFileRoute("/(auth)/register")({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/" });
    }
    return {};
  },
  component: Register,
});

const RegisterFormSchema = z.object({
  username: z.string().min(4, "Username must be at least 4 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RegisterFormSchema),
  });
  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof RegisterFormSchema>) => {
    const res = await registerUser(data);
    if (res.user) {
      setUser(res.user);
      router.navigate({ to: "/" });
    } else console.error(res.error);
  };
  return (
    <div className="mt-20 space-y-2 w-80 mx-auto ring-2 ring-zinc-700 p-4 rounded-lg">
      <div>
        <h1 className="text-2xl font-medium">Register</h1>
        <p className="text-zinc-400 text-sm">
          Enter your username, email and password
        </p>
      </div>
      <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col space-y-1">
          <label htmlFor="username">Username</label>
          <input
            className="bg-zinc-800 p-2 outline-none focus:ring-2 ring-sky-600 rounded-md"
            id="username"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <label htmlFor="email">Email</label>
          <input
            className="bg-zinc-800 p-2 outline-none focus:ring-2 ring-sky-600 rounded-md"
            id="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="bg-zinc-800 p-2 rounded-md focus:ring-2 ring-sky-600 outline-none"
            {...register("password")}
          />
          <p className="text-sm text-red-500">{errors.password?.message}</p>
        </div>
        <Button className="rounded-full" type="submit">
          Register
        </Button>
      </form>
      <p className="text-zinc-400 text-sm">
        Already have an account?{" "}
        <Link className="underline" to="/login">
          Login
        </Link>
      </p>
    </div>
  );
}
