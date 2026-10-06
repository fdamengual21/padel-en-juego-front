import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Search, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { useUser } from "@/app/UserProvider";
import { EmptyState } from "@/components/EmptyState";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import type { Tournament } from "@/domain";
import { ROUTES } from "@/router/routes";
import { useAuthStore } from "@/stores/authStore";
import HomeTournamentCard from "../components/HomeTournamentCard";
import TournamentsPagination from "./components/TournamentsPagination";

const PAGE_SIZE = 12;

export default function UserTournamentsScreen() {
  const { isResolvingUser } = useUser();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const sessionReady = !isResolvingUser;
  const identityKey = !sessionReady
    ? "pending"
    : token?.trim()
      ? (user?.id ?? "pending")
      : "guest";

  const [search, setSearch] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [geoSeeded, setGeoSeeded] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Tournament[]>([]);
  const appendRef = useRef(false);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setGeoSeeded(false);
    setProvinceId(null);
    setMunicipalityId(null);
    setPage(1);
    setItems([]);
    appendRef.current = false;
  }, [identityKey]);

  useEffect(() => {
    if (identityKey === "pending" || geoSeeded) return;
    setProvinceId(user?.provinceId ?? null);
    setMunicipalityId(user?.municipalityId ?? null);
    setGeoSeeded(true);
  }, [identityKey, geoSeeded, user?.provinceId, user?.municipalityId]);

  useEffect(() => {
    appendRef.current = false;
    setPage(1);
    setItems([]);
  }, [debouncedSearch, provinceId, municipalityId]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [
      "public-tournaments",
      debouncedSearch,
      provinceId,
      municipalityId,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      Api.TournamentService().listPublic({
        q: debouncedSearch,
        provinceId,
        municipalityId,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: geoSeeded,
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
  const showLoading = (!geoSeeded || isLoading) && items.length === 0;
  const showLoadError = isError && items.length === 0 && !showLoading;
  const showEmpty = !showLoading && !isError && items.length === 0 && !isFetching;
  const hasActiveFilters = Boolean(debouncedSearch.trim()) || provinceId != null;

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-tournaments">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Torneos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Inscripciones abiertas y torneos que se están jugando.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="tournaments-search" className="sr-only">
            Buscar por nombre de club
          </label>
          <Input
            id="tournaments-search"
            type="search"
            placeholder="Buscar por nombre de club…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="public-tournaments-search"
            className="h-9 pl-8"
          />
        </div>
        <GeographySelectFields
          idPrefix="tournaments-geo"
          provinceId={provinceId}
          municipalityId={municipalityId}
          onProvinceChange={setProvinceId}
          onMunicipalityChange={setMunicipalityId}
          municipalityHint={null}
        />
      </div>

      {isFetching && items.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {showLoading ? (
        <p className="text-sm text-muted-foreground">Cargando torneos…</p>
      ) : null}

      {isError && items.length > 0 ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron actualizar los torneos."
          className="min-h-0 py-8"
        />
      ) : null}

      {showLoadError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los torneos."
        />
      ) : null}

      {!showLoading && items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((tournament) => (
            <HomeTournamentCard
              key={tournament.id}
              tournament={tournament}
              to={ROUTES.player.tournamentDetail(tournament.id)}
            />
          ))}
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={hasActiveFilters ? Search : Trophy}
          title={
            hasActiveFilters
              ? "No hay torneos que coincidan con la búsqueda."
              : "No hay torneos con inscripción abierta."
          }
        />
      ) : null}

      <TournamentsPagination
        page={data?.page ?? page}
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
