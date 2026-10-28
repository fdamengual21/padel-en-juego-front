import { Fragment, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import Avatar from "@/components/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeAppearanceSwitch from "@/layout/ThemeAppearanceSwitch";
import { cn } from "@/lib/utils";

export type AccountActionGroup = "account" | "context" | "session";
type AccountSectionKey = AccountActionGroup | "appearance";

export interface AccountDrawerAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  testId?: string;
  /** Cuenta, cambio de vista o cierre de sesión. */
  group?: AccountActionGroup;
}

interface AccountDrawerMenuProps {
  displayName: string;
  avatarUrl?: string | null;
  /** Fondo del trigger y del menú: canvas claro o sidebar navy. */
  surface: "player" | "club";
  /** Sidebar abre a la derecha; header abre hacia abajo. */
  placement: "sidebar" | "header";
  actions: AccountDrawerAction[];
  testId?: string;
}

const SECTION_ORDER: AccountSectionKey[] = [
  "account",
  "context",
  "appearance",
  "session",
];

function SectionHeading({
  onClub,
  children,
}: {
  onClub: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "px-1.5 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wide",
        onClub ? "text-sidebar-foreground/55" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function AccountActionSections({
  actions,
  onClub = false,
  renderItem,
}: {
  actions: AccountDrawerAction[];
  onClub?: boolean;
  renderItem: (action: AccountDrawerAction) => ReactNode;
}) {
  const sections = SECTION_ORDER.map((key) => ({
    key,
    actions:
      key === "appearance"
        ? null
        : actions.filter((action) => (action.group ?? "account") === key),
  })).filter(
    (section) =>
      section.key === "appearance" || (section.actions?.length ?? 0) > 0,
  );

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.key}>
          {index > 0 ? (
            <div
              className={cn(
                "my-1 h-px",
                onClub ? "bg-sidebar-foreground/15" : "bg-border",
              )}
            />
          ) : null}
          {section.key === "context" ? (
            <SectionHeading onClub={onClub}>Cambiar de vista</SectionHeading>
          ) : null}
          {section.key === "appearance" ? (
            <>
              <SectionHeading onClub={onClub}>Apariencia</SectionHeading>
              <ThemeAppearanceSwitch onClub={onClub} />
            </>
          ) : (
            section.actions?.map((action) => (
              <Fragment key={action.label}>{renderItem(action)}</Fragment>
            ))
          )}
        </Fragment>
      ))}
    </>
  );
}

export default function AccountDrawerMenu({
  displayName,
  avatarUrl,
  surface,
  placement,
  actions,
  testId,
}: AccountDrawerMenuProps) {
  const onClub = surface === "club";
  const inSidebar = placement === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-w-0 items-center rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          inSidebar ? "w-full gap-2.5 px-2 py-1.5" : "gap-1 px-1 py-0.5",
          onClub
            ? "text-sidebar-foreground hover:bg-sidebar-foreground/10"
            : "hover:bg-muted",
        )}
        data-testid={testId}
      >
        {inSidebar ? (
          <Avatar
            name={displayName}
            imageUrl={avatarUrl}
            size="sm"
            alt={displayName}
          />
        ) : null}
        <span className="min-w-0 flex-1">
          {inSidebar ? (
            <>
              <span className="block truncate text-sm font-medium">
                {displayName}
              </span>
              <span
                className={cn(
                  "block text-xs",
                  onClub
                    ? "text-sidebar-foreground/55"
                    : "text-muted-foreground",
                )}
              >
                Cuenta
              </span>
            </>
          ) : (
            <span className="block truncate text-lg font-semibold tracking-tight">
              {displayName}
            </span>
          )}
        </span>
        {inSidebar ? (
          <ChevronRight
            className={cn(
              "size-4 shrink-0",
              onClub ? "text-sidebar-foreground/55" : "text-muted-foreground",
            )}
          />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={inSidebar ? "right" : "bottom"}
        align={inSidebar ? "end" : "start"}
        className={cn(
          "w-56",
          onClub && "bg-sidebar text-sidebar-foreground ring-sidebar-border",
        )}
      >
        <AccountActionSections
          actions={actions}
          onClub={onClub}
          renderItem={(action) => (
            <DropdownMenuItem
              onClick={action.onSelect}
              data-testid={action.testId}
              className={
                onClub
                  ? "focus:bg-sidebar-foreground/10 focus:text-sidebar-foreground"
                  : undefined
              }
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          )}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
