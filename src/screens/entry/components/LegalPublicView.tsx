import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
import { formatPublishedDateEs } from "@/lib/dates";
import type { LegalDocumentType } from "@/modules/legal";
import { ROUTES } from "@/router/routes";

interface LegalPublicViewProps {
  documentType: LegalDocumentType;
}

export default function LegalPublicView({ documentType }: LegalPublicViewProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["legal", "current"],
    queryFn: () => Api.LegalService().getCurrent(),
  });

  const document =
    documentType === "terms" ? data?.terms : data?.privacy;
  const other =
    documentType === "terms"
      ? { to: ROUTES.legal.privacy, label: "Política de privacidad" }
      : { to: ROUTES.legal.terms, label: "Términos y condiciones" };
  const published = document ? formatPublishedDateEs(document.publishedAt) : null;

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
        <p className="text-sm text-muted-foreground">Padel en juego</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando documento…</p>
        ) : null}
        {isError || (!isLoading && !document) ? (
          <p className="text-sm text-destructive">
            No pudimos cargar este documento. Probá de nuevo más tarde.
          </p>
        ) : null}
        {document ? (
          <>
            <header className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Versión {document.version}
                {published ? ` · ${published}` : ""}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {document.title}
              </h1>
            </header>
            <LegalMarkdown markdown={document.body} hideTitle />
          </>
        ) : null}
        <p className="text-sm text-muted-foreground">
          También podés leer los{" "}
          <Link
            to={other.to}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {other.label}
          </Link>
          {" · "}
          <Link
            to={ROUTES.auth.register}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
