import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ROUTES } from "@/router/routes";

export default function ExploreWithoutAccountLink() {
  return (
    <Link
      to={ROUTES.home}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong underline-offset-4 hover:underline md:absolute md:left-6 md:top-6"
      data-testid="explore-without-account"
    >
      <ChevronLeft className="size-4" />
      Explorar sin ingresar
    </Link>
  );
}
