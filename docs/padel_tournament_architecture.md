# Arquitectura y diseño — Plataforma de Torneos de Pádel

> Documento actualizado con las decisiones funcionales, de dominio, arquitectura y UI/UX definidas hasta septiembre de 2026.

---

## 1. Objetivo del producto

La plataforma está pensada como un sistema de gestión de torneos de pádel para dos tipos principales de usuarios:

### Jugadores

Principalmente consumen información:

- Ranking.
- Historial de partidos.
- Torneos jugados.
- Próximos partidos.
- Resultados.
- Parejas.
- Estadísticas.
- Posición dentro de grupos.
- Brackets y evolución del torneo.

La experiencia debe ser principalmente mobile-first y rápida de consultar.

### Clubes / Backoffice

Los clubes utilizan la plataforma para operar:

- Creación y configuración de torneos.
- Categorías.
- Inscripciones.
- Gestión de parejas.
- Configuración de reglas.
- Generación de grupos.
- Generación automática de partidos.
- Gestión de resultados.
- Clasificación.
- Bracket.
- Canchas.
- Disponibilidad.
- Programación automática.
- Reprogramaciones.
- Seguimiento del torneo.

La experiencia del club puede ser más densa y orientada a desktop.

---

# 2. Principio central del producto

El organizador **configura las reglas**, pero no debería tener que construir manualmente la estructura del torneo.

El sistema debe encargarse de:

```text
Configuración
    ↓
Inscripciones
    ↓
Parejas
    ↓
Generación de grupos
    ↓
Generación de partidos
    ↓
Resultados
    ↓
Tabla de posiciones
    ↓
Clasificación
    ↓
Bracket
    ↓
Programación
```

La interfaz debe transmitir que el club **define las reglas y el sistema hace el trabajo pesado**.

---

# 3. Arquitectura general

```text
Club
 ├── Users
 ├── ClubMembers
 ├── ClubRoles
 ├── Players
 ├── Courts
 └── Tournaments
       ├── Categories
       ├── Registrations
       ├── Pairs
       ├── Ruleset
       ├── Groups
       ├── Rounds
       ├── Matches
       ├── MatchSlots
       ├── Standings
       ├── Bracket
       └── Scheduling
```

---

# 4. Entidades principales

## Club

Representa al club que utiliza la plataforma.

```text
Club
- id
- name
- status
- createdAt
- updatedAt
```

---

## User

Cuenta dentro de la plataforma.

```text
User
- id
- name
- email
- phone
- status
- createdAt
```

---

## ClubMember

Relaciona usuarios con clubes.

```text
ClubMember
- id
- clubId
- userId
- status
- joinedAt
```

---

## ClubRole

Los permisos deben depender del club.

Ejemplos:

```text
CLUB_ADMIN
TOURNAMENT_ORGANIZER
STAFF
PLAYER
```

Un mismo usuario podría tener diferentes roles en diferentes clubes.

---

# 5. Player

Un jugador no necesariamente necesita tener una cuenta.

Esto permite registrar jugadores externos (alta manual desde el club o inscripción pública sin login).

```text
Player
- id
- userId nullable          # null si no tiene cuenta
- displayName
- firstName
- lastName
- phone nullable           # opcional en alta club (recomendado)
- email nullable           # opcional
- categoryLevel
- createdAt
```

Si posteriormente el jugador crea una cuenta, se puede asociar el `userId`.

## Alta desde el club

- Búsqueda autocomplete (`searchPlayers`, mín. 2 caracteres) con debounce + `AbortController`.
- Si no existe: **Cargar manualmente** → crea `Player` sin `userId`.
- Obligatorio: nombre y apellido. Teléfono y email opcionales.

---

# 6. Tournament

```text
Tournament
- id
- clubId
- name
- description
- startDate
- endDate
- status
- format
- createdAt
- updatedAt
```

Formatos posibles:

```text
GROUPS_ELIMINATION
DIRECT_ELIMINATION
ROUND_ROBIN
QUALITY
```

## Quality

`QUALITY` debe considerarse un formato de torneo propio y no simplemente:

```text
isQuality = true
```

Esto permite que un torneo Quality tenga reglas específicas y evolucionar el formato sin llenar el modelo de flags.

---

# 7. TournamentCategory

Un torneo puede tener múltiples categorías.

```text
TournamentCategory
- id
- tournamentId
- name
- gender          # male | female | mixed
- kind            # level | suma
- level           # 1ra…8va si kind=level; null si suma
- sumaTarget      # 12 | 15 | … si kind=suma
- maxPairs
- status
```

## Categorías por nivel

Desde **1ª a 8ª**, con género masculino, femenino o mixto.

Ejemplos: `6ta Masculino`, `5ta Femenino`, `4ta Mixto`.

## Categorías suma

`kind = suma` con `sumaTarget` (ej. 12 o 15).

La pareja es válida si la **suma de niveles** de ambos jugadores es exactamente `sumaTarget`.

Ejemplos para **Suma 12**:

- 7ma + 5ta
- 6ta + 6ta
- 8va + 4ta

También puede haber **Suma X mixta** (`gender = mixed`).

## Generación automática

Grupos, partidos de grupos y bracket **no se arman a mano** en la UI.

Se recalculan al confirmar inscripciones (`syncCategoryStructure`) según el ruleset:

```text
Inscripciones confirmadas
    ↓
Config (pairsPerGroup / qualifyPerGroup)
    ↓
groupCount = ceil(parejas / pairsPerGroup)  # se llena en orden: 4+4+1, no 3+3+3
    ↓
Grupos + round-robin
    ↓
Bracket provisional (slots)
    ↓
Auto-schedule (respeta scheduleManual)
```

No se configura a mano la cantidad de zonas: se deriva de las parejas confirmadas. Cada zona se llena hasta `pairsPerGroup`; el remanente queda en la última (aunque sea una sola pareja).

Si el torneo ya tiene partidos de zona jugados, al regenerar **no se recrean esos VS**: se conservan marcador y emparejamiento; solo se agregan los enfrentamientos que falten y se pueden mover parejas que aún no jugaron.
---

# 8. TournamentPair


La unidad competitiva es la pareja. Puede estar **completa** (2 jugadores) o **incompleta** (1 jugador buscando compañero).

```text
TournamentPair
- id
- tournamentCategoryId
- player1Id
- player2Id nullable       # null = inscripción solo
- user1Id / user2Id nullable
- seed
- status
- sidePreference           # drive | reves | any | null
```

## Inscripción desde el club

- Botón **Agregar pareja** en Participantes.
- Se pueden asignar 1 o 2 jugadores.
- Solo (sin player2): se elige preferencia **Drive / Revés / Cualquiera**.
- **Editar** permite completar el segundo jugador después.
- **Eliminar pareja**: baja la inscripción (`CANCELLED` + motivo), retira la pareja (`withdrawn`) y cancela partidos pendientes (sin walkover). Distinto de **Desclasificar**.
- Las parejas incompletas **no entran** al armado de zonas/partidos hasta tener `player2Id`.

API mock:

```text
searchPlayers(query, { signal })
createPlayer(input)
registerPair(input)
updatePairPlayers(pairId, input)
removeRegistration(registrationId, note)
```

---

# 9. Registration

```text
TournamentRegistration
- id
- tournamentCategoryId
- pairId
- status
- registeredAt
```

Estados posibles:

```text
PENDING
CONFIRMED
WAITLIST
CANCELLED
```

---

# 10. Reglas del torneo

La configuración de reglas debe estar separada de la lógica de partidos.

## MatchRules

```text
MatchRules
- setFormat
- setsToWin
- gamesPerSet
- advantageType
- goldenPoint
- tiebreakEnabled
- tiebreakPoints
- tiebreakWinByTwo
- superTiebreakEnabled
- superTiebreakPoints
- superTiebreakWinByTwo
```

Ejemplos:

### Partido tradicional

```text
Best of 3
6 games
Ventaja
Tie-break a 7
Win by 2
```

### Partido rápido

```text
1 set
6 games
Golden Point
Tie-break a 7
```

### Super tie-break

```text
2 sets
Si quedan 1-1
Super tie-break a 10
Win by 2
```

---

# 11. Reglas configurables

El organizador debería poder configurar:

- Cantidad de sets.
- Sets necesarios para ganar.
- Cantidad de games por set.
- Ventaja.
- Golden Point.
- Tie-break.
- Puntos del tie-break.
- Win by 2.
- Super tie-break.
- Puntos del super tie-break.
- Win by 2.

La UI debe mostrar presets para evitar que el usuario tenga que entender toda la configuración técnica.

Ejemplo:

```text
┌──────────────────────────────┐
│ Formato del partido          │
│                              │
│ ● Best of 3                  │
│ ○ 1 set                      │
│ ○ 2 sets + Super Tie-break   │
└──────────────────────────────┘
```

Y luego permitir ajustes avanzados.

---

# 12. Tournament Ruleset

Conviene tener presets:

```text
TournamentRuleset
```

Ejemplos:

```text
STANDARD
QUALITY
FAST
CUSTOM
```

Esto permite:

```text
Crear torneo
    ↓
Elegir preset
    ↓
Modificar si es necesario
```

En vez de comenzar con 15 switches.

---

# 13. Grupos

## TournamentGroup

```text
TournamentGroup
- id
- tournamentCategoryId
- name
- order
```

Ejemplos:

```text
Grupo A
Grupo B
Grupo C
Grupo D
```

---

# 14. Generación automática de grupos

El organizador no debería dibujar los grupos manualmente.

Debe indicar parámetros como:

```text
Cantidad de parejas
Cantidad de grupos
Parejas por grupo
Cantidad de clasificados
```

Ejemplo:

```text
12 parejas

4 grupos
3 parejas por grupo
2 clasifican

Resultado:

Grupo A → 1° / 2° / 3°
Grupo B → 1° / 2° / 3°
Grupo C → 1° / 2° / 3°
Grupo D → 1° / 2° / 3°
```

Los 8 clasificados generan un R16 limpio.

---

# 15. Validación de formatos de grupos

El sistema debe detectar configuraciones problemáticas.

Ejemplo:

```text
12 parejas
3 grupos
4 parejas por grupo
2 clasifican
```

Esto produce:

```text
6 clasificados
```

No alcanza para un bracket tradicional de 8.

Por lo tanto, el sistema debe obligar a definir una regla complementaria:

```text
Mejores terceros
Play-in
BYE
Otra regla de clasificación
```

La UI debe avisarlo antes de crear el torneo.

Ejemplo:

```text
⚠ Esta configuración genera 6 clasificados.

Para continuar necesitás definir cómo completar
la llave de eliminación.

[Configurar clasificación]
```

---

# 16. Generación de partidos de grupos

Los partidos de grupos deben generarse automáticamente.

Para un grupo de 3:

```text
A vs B
A vs C
B vs C
```

Para un grupo de 4:

```text
A vs B
C vs D
A vs C
B vs D
A vs D
B vs C
```

Para cantidades impares se puede utilizar el método de round-robin/circle method y manejar BYEs.

Un BYE **no es un partido** y no debe aparecer como partido real en estadísticas o resultados.

---

# 17. Standings

## GroupStanding

```text
GroupStanding
- groupId
- pairId
- played
- won
- lost
- points
- setsWon
- setsLost
- gamesWon
- gamesLost
- position
```

Ejemplo:

```text
POS  PAREJA              PJ  PG  PP  PTS
1    Juan / Pedro         3   3   0   6
2    Lucas / Martín       3   2   1   4
3    Diego / Nico         3   1   2   2
4    Pablo / Tomás        3   0   3   0
```

---

# 18. Tie-breakers

Los desempates deben ser configurables.

Posibles criterios:

```text
1. Points
2. Head-to-head
3. Set difference
4. Game difference
5. Games won
6. Draw
```

Idealmente se guarda el orden:

```text
tieBreakers = [
    POINTS,
    HEAD_TO_HEAD,
    SET_DIFFERENCE,
    GAME_DIFFERENCE
]
```

Esto evita hardcodear una única regla.

---

# 19. Bracket

El bracket no debe ser la fuente de verdad.

La fuente de verdad debe ser:

```text
Matches
MatchParticipants
Results
Standings
Qualification
```

El bracket es una representación visual del estado.

---

# 20. Match

```text
Match
- id
- tournamentCategoryId
- phase
- roundId
- scheduledAt nullable
- courtId nullable
- status
- winnerPairId nullable
```

Ejemplos de fases:

```text
GROUP
PLAY_IN
R32
R16
QF
SF
FINAL
CONSOLATION
```

---

# 21. MatchSlot / MatchParticipant

Es importante no asumir que todos los participantes se conocen desde el principio.

Ejemplo:

```text
Match 21

Slot A:
1° Grupo A

Slot B:
2° Grupo B
```

Después de terminar los grupos, el sistema resuelve:

```text
1° Grupo A → Pareja 7
2° Grupo B → Pareja 3
```

También puede existir:

```text
MATCH_WINNER
MATCH_LOSER
GROUP_POSITION
PAIR
```

Esto permite construir brackets completos antes de conocer todos los participantes.

---

# 22. TournamentRound

```text
TournamentRound
- id
- tournamentCategoryId
- name
- order
- type
```

Ejemplo:

```text
Grupos
Play-in
Octavos
Cuartos
Semifinal
Final
```

---

# 23. Bracket frontend

No conviene usar una librería especializada exclusivamente en brackets.

La recomendación es:

```text
React
Vite
TypeScript
@xyflow/react
@dagrejs/dagre
```

## @xyflow/react

Se utiliza para representar el bracket como un grafo.

Cada partido puede ser un custom node:

```text
┌──────────────────────┐
│ CUARTOS              │
│                      │
│ 🟢 Juan / Pedro      │
│    6 - 3 / 6 - 4     │
│                      │
│ ⚪ Lucas / Martín     │
│    3 - 6 / 4 - 6     │
└──────────────────────┘
```

Las conexiones representan el flujo de clasificación.

## @dagrejs/dagre

Puede calcular automáticamente la distribución espacial de los partidos.

El backend entrega el estado.

React Flow se ocupa principalmente de visualizarlo.

---

# 24. Bracket en mobile

No intentar mostrar todo el bracket en una pantalla pequeña.

Usar:

```text
[Grupos] [Octavos] [Cuartos] [Semis] [Final]
```

y permitir:

- Pan.
- Zoom.
- Pinch.
- Navegación entre rondas.

La experiencia mobile debe sentirse como una aplicación deportiva, no como un diagrama técnico.

---

# 25. Scheduling

El scheduling debe ser un módulo separado del bracket.

No debería existir:

```text
BracketService → decide horario
```

Sino:

```text
BracketService
       ↓
Matches disponibles

SchedulingService
       ↓
Busca slots posibles
```

---

# 26. Disponibilidad de parejas

La disponibilidad debe ser **exacta por fecha y rango horario**.

No usar:

```text
Mañana
Tarde
Noche
```

Ejemplo real:

```text
2026-09-11
18:00 - 23:00

2026-09-12
10:00 - 14:00

2026-09-12
18:00 - 22:00
```

## PairAvailability

```text
PairAvailability
- id
- pairId
- date
- startTime
- endTime
- priority nullable
```

Esto permite torneos largos y evita asumir que una pareja está disponible todo el día.

---

# 27. Court

```text
Court
- id
- clubId
- name
- status
```

Ejemplos:

```text
Cancha 1
Cancha 2
Cancha 3
Cancha 4
```

---

# 28. CourtAvailability

```text
CourtAvailability
- id
- courtId
- date
- startTime
- endTime
```

La cancha también tiene disponibilidad.

---

# 29. AutoMatch / Scheduling Engine

Para encontrar un horario posible se intersectan:

```text
Disponibilidad pareja A
        ∩
Disponibilidad pareja B
        ∩
Disponibilidad cancha
        ∩
Horario del torneo
        ∩
Reglas de descanso
```

Además se consideran restricciones como:

- Minimum rest.
- Maximum matches per day.
- Maximum consecutive matches.
- Tiempo estimado del partido.
- Disponibilidad de cancha.

---

# 30. Hard constraints vs Soft constraints

Es importante separar:

## Hard constraints

Si no se cumplen, el slot es inválido.

Ejemplo:

```text
Pareja A no disponible
→ DESCARTAR

Pareja B no disponible
→ DESCARTAR

Cancha ocupada
→ DESCARTAR

No se cumple descanso mínimo
→ DESCARTAR
```

## Soft constraints

Sirven para ordenar candidatos.

Ejemplo:

```text
La pareja prefiere jugar después de las 18:00
→ +score

Jugaría muy temprano
→ -score

Tiene demasiados partidos ese día
→ -score
```

---

# 31. Ejemplo de AutoMatch

```text
Candidate Slot

Pareja A disponible        ✓
Pareja B disponible        ✓
Cancha disponible          ✓
Descanso suficiente        ✓
Máximo partidos/día        ✓
Preferencia horaria        ✓

Score = 96
```

Otro:

```text
Pareja A disponible        ✓
Pareja B disponible        ✓
Cancha disponible          ✓
Descanso suficiente        ✓
Preferencia horaria        ✗

Score = 72
```

El motor selecciona el candidato válido con mejor score.

---

# 32. Tournament Engine

Una arquitectura posible:

```text
Tournament Engine
 ├── Registration
 ├── Group Generation
 ├── Match Generation
 ├── Standings
 ├── Qualification
 ├── Bracket Generation
 ├── Scheduling
 └── Match Result Processing
```

Entrada:

```text
TournamentConfig
Registrations
Rules
Availability
Results
```

Salida:

```text
TournamentState
```

---

# 33. Servicios backend

Separar responsabilidades:

```text
TournamentService
TournamentRegistrationService
GroupService
StandingsService
QualificationService
MatchService
RulesService
BracketService
SchedulingService
```

La lógica de dominio no debe depender de React ni de componentes visuales.

---

# 34. API conceptual

## Torneos

```http
POST /tournaments
GET /tournaments
PATCH /tournaments/{id}
```

## Categorías

```http
POST /tournaments/{id}/categories
GET /tournaments/{id}/categories
```

## Inscripciones

```http
POST /tournament-categories/{id}/registrations
GET /tournament-categories/{id}/registrations
```

## Grupos

```http
GET /tournament-categories/{id}/groups
```

## Partidos

```http
GET /tournament-categories/{id}/matches
POST /matches/{id}/result
```

## Bracket / Cuadro

```http
GET /tournament-categories/{id}/bracket
GET /tournament-categories/{id}/cuadro-board
```

`getCuadroBoard` (mock `core-api`) devuelve una vista **ya procesada** para el gráfico:

```text
CuadroBoardView
- groups, groupMatches
- rounds, elimMatches, slots
- pairLabels, pairPlayerNames, matchRules
- unassignedPairs   # confirmadas/completas fuera de zona
- notice            # aviso UX (cupos / incompletas)
- generatedAt
```

La pestaña **Cuadro** del club consume ese recurso y al entrar sincroniza la estructura (incorpora parejas nuevas si faltan) y refetch.
Si una pareja completa quedó fuera, el sync la mete respetando el cupo (`pairsPerGroup`) conservando VS ya jugados.

Cada tab del detalle de torneo tiene su board DTO en core-api y se refresca al hacer foco:

| Tab | Endpoint ficticio |
|-----|-------------------|
| Zonas | `getZonesBoard` |
| Participantes | `getParticipantsBoard` |
| Cuadro | `getCuadroBoard` |
| Partidos | `getMatchesBoard` |
| Config | `getConfigBoard` |

Al cambiar cupo (`pairsPerGroup`) con partidos jugados, aplicar conserva los VS ya jugados y rearma zonas al nuevo cupo.

## Scheduling

```http
POST /tournament-categories/{id}/schedule
GET /tournament-categories/{id}/schedule
```

## Availability

```http
POST /pairs/{id}/availability
GET /pairs/{id}/availability
```

---

# 35. UI/UX — decisión principal

## Stack recomendado

```text
React
+
Vite
+
TypeScript
+
shadcn/ui
+
Tailwind CSS
+
Base UI
+
Lucide
```

### ¿Por qué no MUI?

MUI es excelente para sistemas administrativos, pero para este producto puede transmitir demasiado:

- Enterprise.
- ERP.
- Formularios tradicionales.
- Interfaces muy estructuradas.
- Componentes visualmente genéricos.

El problema no es técnico: es de identidad visual.

El producto debería sentirse más como:

```text
Club deportivo premium
```

y menos como:

```text
Sistema administrativo
```

---

# 36. shadcn/ui

La recomendación es usar shadcn como **base de un design system propio**, no instalarlo y dejar sus defaults sin modificar.

shadcn es especialmente útil porque los componentes se incorporan como código al proyecto y se pueden modificar directamente.

Esto permite tener control total sobre:

- Radius.
- Spacing.
- Tipografía.
- Colores.
- Bordes.
- Estados.
- Animaciones.
- Densidad.
- Componentes deportivos específicos.

En proyectos nuevos, la configuración actual de shadcn utiliza Base UI por defecto, manteniendo también soporte para Radix.

---

# 37. Design direction

La dirección visual recomendada:

> **Premium padel club**

Debe ser:

- Moderna.
- Limpia.
- Deportiva.
- Sobria.
- Con personalidad.
- Fácil de leer.
- Sin exceso de decoración.
- Sin estética "gaming".
- Sin parecer un ERP.

---

# 38. Design tokens

Crear tokens propios.

Ejemplo conceptual:

```text
background
surface
surface-elevated
foreground
muted
border
primary
secondary
success
warning
danger
```

Además:

```text
radius-xs
radius-sm
radius-md
radius-lg

spacing-xs
spacing-sm
spacing-md
spacing-lg
spacing-xl
```

Y una escala tipográfica consistente.

---

# 39. Color

No usar demasiados colores.

Ideal:

```text
Neutros
+
1 color de marca fuerte
+
colores semánticos
```

El color de marca puede ser verde/lima u otro color asociado al club, pero utilizado como acento.

No convertir toda la aplicación en verde.

Usarlo para:

- CTAs.
- Estado activo.
- Ranking destacado.
- Elementos importantes.
- Indicadores deportivos.

---

# 40. Cards

No todas las cosas deben ser una Card.

Evitar:

```text
Card
 └── Card
      └── Card
           └── Card
```

Usar diferentes niveles de superficie:

```text
Page background
    ↓
Surface
    ↓
Elevated surface
```

Las cards deberían reservarse para información que realmente necesita agruparse.

---

# 41. Componentes de dominio

Además de los componentes de shadcn, crear componentes propios.

```text
MatchCard
PlayerAvatar
TournamentBadge
RankingPosition
Score
CourtBadge
PairCard
TournamentCard
BracketMatch
```

Para backoffice:

```text
TournamentStats
RegistrationTable
ScheduleGrid
GroupTable
BracketView
AvailabilityEditor
CourtSchedule
```

Esto evita que el dominio termine expresado como una colección de `Card`, `Badge`, `Dialog` y `Table` genéricos.

---

# 42. Player UI

El jugador necesita una interfaz mucho más liviana.

Posible navegación mobile:

```text
┌─────────────────────────────┐
│                             │
│         CONTENT             │
│                             │
│                             │
├─────────────────────────────┤
│ Inicio │ Torneos │ Ranking │
│        │          │         │
│ Historial │ Perfil          │
└─────────────────────────────┘
```

Prioridad:

1. Próximo partido.
2. Resultado reciente.
3. Ranking.
4. Torneos.
5. Historial.
6. Estadísticas.

---

# 43. Club Backoffice

El club necesita más densidad.

Desktop:

```text
┌────────────┬───────────────────────────────┐
│            │                               │
│ Dashboard  │       Tournament              │
│            │                               │
│ Torneos    │       Overview                │
│ Categorías │                               │
│ Jugadores  │                               │
│ Canchas    │                               │
│ Agenda     │                               │
│            │                               │
└────────────┴───────────────────────────────┘
```

La navegación lateral es apropiada para backoffice.

---

# 44. Misma identidad, distinta densidad

No crear dos productos visualmente diferentes.

Debe existir:

```text
Brand identity
      │
      ├── Player UI
      │      └── ligera / mobile / visual
      │
      └── Club UI
             └── densa / desktop / operacional
```

Comparten:

- Colores.
- Tipografía.
- Iconografía.
- Radius.
- Componentes.
- Estados.
- Branding.

Pero no necesariamente la misma densidad de información.

---

# 45. Match Card

El partido debería ser uno de los componentes más importantes del sistema.

Ejemplo:

```text
┌──────────────────────────────────┐
│ SEMIFINAL                 18:30  │
│ Cancha 2                         │
│                                  │
│ 🟢 Juan Pérez / Pedro Díaz       │
│                         6  6     │
│                                  │
│ ⚪ Lucas Ruiz / Martín Gómez      │
│                         4  3     │
│                                  │
│ FINALIZADO                       │
└──────────────────────────────────┘
```

El score debe tener una tipografía más fuerte/condensada para aportar identidad deportiva.

---

# 46. Estados

Usar estados visuales pequeños y claros:

```text
EN VIVO
FINALIZADO
PROGRAMADO
PENDIENTE
CANCELADO
```

No convertir cada estado en una gran sección de color.

---

# 47. Tournament Card

Ejemplo conceptual:

```text
┌───────────────────────────────────┐
│ OPEN PADEL NIGHT          12 SEP  │
│                                   │
│ 6ta Masculino                     │
│ 16 parejas                        │
│                                   │
│ ● Inscripciones abiertas          │
│                                   │
│ [Ver torneo]                      │
└───────────────────────────────────┘
```

Debe comunicar rápidamente:

- Qué torneo es.
- Categoría.
- Fecha.
- Estado.
- Cantidad de participantes.
- Acción principal.

---

# 48. Dashboard del club

No mostrar todo al mismo nivel.

Priorizar:

```text
┌──────────────────────────────────────────┐
│ Próximos partidos                        │
│ 12 partidos hoy                          │
├────────────┬────────────┬────────────────┤
│ Inscritos  │ En juego   │ Canchas        │
│ 42         │ 3          │ 6/8            │
├────────────┴────────────┴────────────────┤
│ Actividad del torneo                     │
│                                          │
│ Grupo A       █████████░░ 80%            │
│ Grupo B       ██████░░░░░ 60%            │
│ Grupo C       ██████████ 100%            │
└──────────────────────────────────────────┘
```

El dashboard debe responder:

> "¿Qué está pasando ahora y qué necesito hacer?"

No intentar mostrar todos los datos existentes.

---

# 49. Tournament detail para club

Cabecera fija con **cards de resumen** siempre visibles (inscritos, grupos, en juego, finalizados).

No usar pestaña "Resumen" ni "Resultados" (el resultado se ve en partidos/bracket).

Tabs:

```text
Participantes
Grupos
Partidos
Bracket
Agenda
Configuración
```

**Configuración** reutiliza el **mismo formulario** de creación de torneo, en una sola vista con secciones (Información, Categoría, Formato, Reglas, Resumen) — sin wizard por pasos.

En **Agenda**, los horarios se calculan por disponibilidad ∩ ventana del torneo; un cambio manual marca `scheduleManual` y no lo pisa el auto-schedule.

En mobile, algunas secciones pueden convertirse en navegación horizontal o páginas independientes.

---

# 50. Formulario de creación / configuración de torneo

Un **solo formulario** (crear y editar config), separado por **secciones** en la misma pantalla — no wizard por pasos.

```text
Información
Categoría
Formato (+ grupos / clasifican si aplica)
Reglas (preset)
Resumen
[Crear torneo] / [Guardar configuración]
```

El resumen muestra consecuencias simples (parejas, grupos, clasificados, ventana horaria).

---

# 51. UX del bracket

No exponer detalles técnicos como:

```text
MATCH_WINNER
GROUP_POSITION
SOURCE_TYPE
```

Eso es backend/domain.

El usuario debería ver:

```text
1° Grupo A
       ↓
Juan / Pedro
       ↓
Semifinal
```

---

# 52. Regla UX importante

El sistema debe mostrar decisiones complejas como consecuencias simples.

En vez de:

```text
qualificationRule:
  source = GROUP_POSITION
  position = 2
  ranking = ...
```

mostrar:

```text
Clasifican los 2 mejores de cada grupo
```

La configuración técnica pertenece al dominio, no a la UI.

---

# 53. Mobile event / match scheduling

Para jugadores:

```text
Próximo partido

Hoy · 19:30
Cancha 3

Juan / Pedro
vs
Lucas / Martín

[Ver partido]
```

Para clubes:

```text
Agenda
────────────────────────────
18:00  Cancha 1
       Grupo A · Partido 3

18:30  Cancha 2
       Grupo B · Partido 4

19:00  Cancha 1
       Grupo C · Partido 2
```

---

# 54. Scheduling UI

La agenda debe permitir visualizar:

```text
Por cancha
Por horario
Por categoría
Por grupo
Por pareja
```

Una vista tipo calendario/grid puede ser la principal para el club.

En mobile, priorizar una lista cronológica.

---

# 55. Auto-scheduling UX

No presentar AutoMatch como una caja negra.

Antes:

```text
[Programar automáticamente]
```

Mostrar un resumen:

```text
24 partidos pendientes

Canchas disponibles: 6
Disponibilidad cargada: 92%
Restricción de descanso: 30 min

[Generar programación]
```

Después:

```text
✓ 24 partidos programados

⚠ 2 partidos tienen horarios subóptimos

[Ver agenda]
```

Esto genera confianza.

---

# 56. Backend vs frontend

La generación de:

- grupos
- partidos
- clasificación
- bracket
- horarios

debe vivir en backend/domain services.

El frontend:

- configura.
- muestra.
- permite editar inputs.
- visualiza resultados.
- muestra errores.
- ejecuta acciones.

No debe replicar la lógica del torneo.

---

# 57. Orden recomendado de implementación

## Fase 1

Clubes:

```text
Club
User
ClubMember
ClubRole
Player
```

## Fase 2

Torneos:

```text
Tournament
TournamentCategory
TournamentPair
TournamentRegistration
```

## Fase 3

Reglas:

```text
TournamentRuleset
MatchRules
```

## Fase 4

Grupos:

```text
TournamentGroup
GroupStanding
Round robin
Results
Tie breakers
```

## Fase 5

Eliminación:

```text
TournamentRound
Match
MatchSlot
Qualification
Bracket
```

## Fase 6

Scheduling:

```text
Court
CourtAvailability
PairAvailability
SchedulingService
AutoMatch
```

## Fase 7

Frontend:

```text
Player UI
Club Backoffice
Bracket
Agenda
Dashboard
```

## Fase 8

Features avanzadas:

```text
Consolation
Play-in
Multiple qualification rules
Advanced scheduling
Weighted preferences
Notifications
Payments
Rankings
Statistics
Complex Quality formats
```

---

# 58. Estructura sugerida del frontend

```text
src/
├── app/                      # providers (sesion mock, etc.)
├── layout/                   # ClubShell, UserShell
├── screens/
│   ├── entry/EntryScreen/
│   ├── club/                 # modo club
│   │   ├── components/       # compartido del modo (TournamentForm)
│   │   └── Club*Screen/      # + components/ locales si aplica
│   └── users/                # modo usuario/jugador
│       └── User*Screen/
├── components/
│   ├── ui/                   # shadcn
│   └── tournaments/          # dominio reutilizable (ambos modos)
├── modules/                  # services + repositories
├── api/
├── router/
├── hooks/
├── lib/
└── types/
```

---

# 59. Librerías frontend

Stack recomendado:

```text
React
Vite
TypeScript
shadcn/ui
Tailwind CSS
Base UI
Lucide
TanStack Query
React Hook Form
Zod
@xyflow/react
@dagrejs/dagre
```

## Responsabilidades

### TanStack Query

Estado remoto/API.

### React Hook Form

Formularios complejos.

### Zod

Validación de inputs.

### shadcn/ui

Base visual.

### Tailwind

Layout, spacing y estilos.

### Lucide

Iconografía.

### React Flow

Visualización del bracket.

### Dagre

Layout automático del bracket.

---

# 60. Alternativas de UI library

## Opción 1 — recomendada

### shadcn/ui + Tailwind

Mejor balance entre:

- Personalización.
- Diseño moderno.
- Control visual.
- Velocidad de desarrollo.
- Experiencia mobile.
- Backoffice.
- Componentes custom.

## Opción 2

### Mantine

Buena alternativa si la prioridad fuera construir rápidamente un backoffice completo con muchos componentes listos.

## Opción 3

### MUI

Excelente si el producto necesitara priorizar:

- Enterprise.
- Formularios administrativos.
- Data-heavy screens.
- Madurez.
- Componentes muy completos.

Pero no sería mi primera opción para este producto por la identidad visual buscada.

---

# 61. Decisión final de UI/UX

La dirección recomendada queda:

```text
React
  +
Vite
  +
TypeScript
  +
shadcn/ui
  +
Tailwind
  +
Base UI
  +
Lucide
```

Sobre eso:

```text
Custom Design System
        ↓
Domain Components
        ↓
Player Experience
        +
Club Backoffice
```

El objetivo no es tener una UI "llamativa".

El objetivo es tener una UI:

> **deportiva, premium, limpia y con personalidad, sin parecer un ERP ni una aplicación gaming.**

---

# 62. Principios de diseño definitivos

1. **El sistema hace el trabajo complejo.**
2. **El organizador configura, no dibuja.**
3. **El bracket es una representación, no la fuente de verdad.**
4. **La disponibilidad siempre es fecha + rango horario.**
5. **Hard constraints y soft preferences deben estar separados.**
6. **La información importante debe tener jerarquía visual.**
7. **No todo necesita ser una card.**
8. **El jugador y el club comparten identidad visual.**
9. **El jugador tiene una experiencia liviana y mobile-first.**
10. **El club tiene una experiencia operacional y densa.**
11. **Los componentes genéricos deben evolucionar a componentes de dominio.**
12. **La configuración avanzada debe estar escondida detrás de presets / opciones avanzadas.**
13. **El sistema debe validar configuraciones imposibles antes de generar el torneo.**
14. **La lógica del torneo vive en backend/domain, no en React.**
15. **El diseño debe sentirse como un club deportivo premium, no como un ERP.**

---

# 63. Resumen de arquitectura

```text
                         ┌─────────────────────┐
                         │       CLUB          │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                BACKOFFICE                     PLAYERS
                     │                             │
          ┌──────────┴──────────┐          ┌───────┴────────┐
          │                     │          │                │
     Tournament              Scheduling  Ranking         History
          │                     │          │                │
     ┌────┴─────┐          ┌────┴────┐     └──────┬─────────┘
     │          │          │         │            │
 Categories   Rules      Courts   Availability   Stats
     │
     ├── Registrations
     ├── Pairs
     ├── Groups
     ├── Matches
     ├── Standings
     ├── Qualification
     └── Bracket
```

---

# 64. Visión final

La plataforma debería sentirse como:

```text
                    PÁDEL
                      +
              AUTOMATIZACIÓN
                      +
               BUEN DISEÑO
                      +
              REGLAS FLEXIBLES
                      +
             OPERACIÓN SIMPLE
```

El diferencial no debería ser simplemente "registrar torneos".

El producto puede diferenciarse por hacer que un torneo complejo sea fácil de operar:

```text
"Configuro el torneo,
cargo las parejas,
indico disponibilidad,
y el sistema se encarga del resto."
```

Ese debería ser uno de los principales principios de producto.
