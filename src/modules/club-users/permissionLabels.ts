const labels: Record<string, string> = {
  "club.users.read": "Ver usuarios",
  "club.users.invite": "Invitar y reactivar",
  "club.users.deactivate": "Dar de baja",
  "club.users.roles.assign": "Cambiar roles",
  "club.settings.read": "Ver la ficha del club",
  "club.settings.update": "Editar la ficha del club",
  "club.tournaments.read": "Ver torneos",
  "club.tournaments.write": "Crear y editar torneos",
  "club.courts.read": "Ver canchas",
  "club.courts.write": "Editar canchas",
  "club.clients.read": "Ver clientes",
  "club.clients.write": "Editar clientes",
  "club.reservations.read": "Ver reservas",
  "club.reservations.write": "Gestionar reservas",
  "club.schedule.read": "Ver la agenda",
  "club.lessons.read": "Ver clases",
  "club.lessons.write": "Gestionar clases",
};

export function clubPermissionLabel(code: string): string {
  return labels[code] ?? code;
}
