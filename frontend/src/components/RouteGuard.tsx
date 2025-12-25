import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface Props {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!user && !token && !savedUser) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return user ? <>{children}</> : null;
}
