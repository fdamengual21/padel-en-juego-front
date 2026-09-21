import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Api from "@/api/Api";
import { useUser } from "@/app/UserProvider";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import type { PublicClubListItem } from "@/modules/clubs";
import { useAuthStore } from "@/stores/authStore";
import ClubListCard from "./components/ClubListCard";
import ClubsPagination from "./components/ClubsPagination";

const PAGE_SIZE = 12;

export default function UserClubsScreen() {
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
  const [items, setItems] = useState<PublicClubListItem[]>([]);
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
      "public-clubs",
      debouncedSearch,
      provinceId,
      municipalityId,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      Api.ClubService().listPublic({
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
  const showSkeletons = (!geoSeeded || isLoading) && items.length === 0;

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-clubs">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Clubes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontrá predios, horarios y turnos disponibles hoy.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="clubs-search" className="sr-only">
            Buscar clubes
          </label>
          <Input
            id="clubs-search"
            type="search"
            placeholder="Buscar por nombre o localidad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="public-clubs-search"
            className="h-9 pl-8"
          />
        </div>
        <GeographySelectFields
          idPrefix="clubs-geo"
          provinceId={provinceId}
          municipalityId={municipalityId}
          onProvinceChange={setProvinceId}
          onMunicipalityChange={setMunicipalityId}
          municipalityHint={null}
        />
      </div>

      {isFetching && items.length > 0 ? (
        <p className="text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {isError ? (
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los clubes.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {showSkeletons
          ? Array.from({ length: PAGE_SIZE }, (_, i) => (
              <ClubCardSkeleton key={`sk-${i}`} />
            ))
          : items.map((club) => <ClubListCard key={club.id} club={club} />)}
      </div>

      {!showSkeletons && items.length === 0 && !isFetching ? (
        <p className="text-sm text-muted-foreground">
          {debouncedSearch.trim() || provinceId != null
            ? "No hay clubes que coincidan con la búsqueda."
            : "Todavía no hay clubes para mostrar."}
        </p>
      ) : null}

      <ClubsPagination
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

function ClubCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-hidden
    >
      <div className="aspect-[5/3] animate-pulse bg-muted md:aspect-[16/10]" />
      <div className="space-y-1.5 p-2 md:p-3">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
