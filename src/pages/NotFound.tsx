import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import VinnyBackground from "@/components/VinnyBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <VinnyBackground />
      <div className="relative z-10 text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">404</h1>
        <p className="mb-4 text-xl text-zinc-400">Oops! Page not found</p>
        <a href="/" className="text-[#3B9EFF] underline hover:text-[#3B9EFF]/80">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
