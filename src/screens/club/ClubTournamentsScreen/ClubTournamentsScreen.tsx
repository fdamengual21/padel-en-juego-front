import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization/permissionCodes";
import { PermissionsGuard } from "@/components/guards";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import type { Tournament } from "@/domain";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import HomeTournamentCard from "@/screens/users/components/HomeTournamentCard";
import TournamentsPagination from "@/screens/users/UserTournamentsScreen/components/TournamentsPagination";

const PAGE_SIZE = 12;

type Scope = "open" | "all";

export default function ClubTournamentsScreen() {
  const { clubId } = useMockSession();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("open");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Tournament[]>([]);
  const appendRef = useRef(false);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    appendRef.current = false;
    setPage(1);
    setItems([]);
  }, [debouncedSearch, scope, clubId]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["tournaments", clubId, debouncedSearch, scope, page],
    queryFn: () =>
      Api.TournamentService().list({
        q: debouncedSearch,
        scope,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(clubId),
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) =>
      appendRef.current && data.page > 1 ? [...prev, ...data.items] : data.items,
    );
    appendRef.current = false;
  }, [data]);

  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  return (
    <div className="space-y-6" data-testid="club-tournaments">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Torneos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {scope === "open"
              ? "Borradores, inscripciones abiertas y en curso. Los más recientes primero."
              : "Todos los torneos, los más recientes primero."}
          </p>
        </div>
        <PermissionsGuard permission={PERMISSION_CLUB_TOURNAMENTS_WRITE}>
          <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants())}>
            Crear torneo
          </Link>
        </PermissionsGuard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="club-tournaments-search" className="sr-only">
            Buscar por nombre
          </label>
          <Input
            id="club-tournaments-search"
            type="search"
            placeholder="Buscar por nombre"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={scope === "open" ? "default" : "outline"}
            onClick={() => setScope("open")}
          >
            Pendientes y activos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scope === "all" ? "default" : "outline"}
            onClick={() => setScope("all")}
          >
            Todos
          </Button>
        </div>
      </div>

      {isFetching && items.length > 0 ? (
        <p className="text-sm text-muted-foreground">Actualizando…</p>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los torneos.</p>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay torneos con ese filtro.</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((tournament) => (
          <HomeTournamentCard
            key={tournament.id}
            tournament={tournament}
            to={ROUTES.club.tournamentDetail(tournament.id)}
            showImage={false}
            showClubName={false}
          />
        ))}
      </div>

      <TournamentsPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        loadedCount={items.length}
        disabled={isFetching}
        onPageChange={(next) => {
          appendRef.current = false;
          setPage(next);
        }}
        onLoadMore={() => {
          appendRef.current = true;
          setPage((current) => current + 1);
        }}
      />
    </div>
  );
}
