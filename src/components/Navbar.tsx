import isAuthenticated from "@/utils/isAuthenticated";
import { Link, useLocation } from "@tanstack/react-router";

export default function Navbar() {
  const location = useLocation();
  return (
    <header className="border-b border-zinc-600">
      <nav className="flex justify-between p-4">
        <h1>Signer</h1>
        <ul className="flex space-x-4">
          <Link
            className={`hover:underline ${location.pathname === "/" ? "text-sky-300" : ""}`}
            to="/"
          >
            Home
          </Link>
          {isAuthenticated() ? (
            <Link
              className={`hover:underline ${location.pathname === "/dashboard" ? "text-sky-300" : ""}`}
              to="/dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              className={`hover:underline ${location.pathname === "/login" ? "text-sky-300" : ""}`}
              to="/login"
            >
              Login
            </Link>
          )}
        </ul>
      </nav>
    </header>
  );
}
