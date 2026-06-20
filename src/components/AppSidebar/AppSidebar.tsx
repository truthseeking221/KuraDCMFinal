"use client";

import type { ComponentType, CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionList, Avatar, Badge } from "@/components/ui";
import type { SettingsSectionId } from "@/components/SettingsView";
import {
  Bell as BellIcon,
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Catalog as CatalogIcon,
  Check as CheckIcon,
  Corporate as CorporateIcon,
  CreditCard as CreditCardIcon,
  Heart as HeartIcon,
  Home as HomeIcon,
  IDCard as IDCardIcon,
  More as MoreIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Search as SearchIcon,
  Setting as SettingIcon,
  Share as ShareIcon,
  TeleConsultation as TeleConsultationIcon,
  Tube as TubeIcon,
} from "@/icons/components";
import type { IconProps, IconStyle } from "@/icons/components/types";

export type AppSidebarPageId = "home" | "search" | "patients" | "bookings" | "catalog" | "more" | "settings";

type NavIconComponent = ComponentType<IconProps>;
type NavItem = {
  id: AppSidebarPageId;
  label: string;
  Icon: NavIconComponent;
  activeVariant?: IconStyle;
  disabled?: boolean;
  restVariant?: IconStyle;
};
type MoreMenuItem = {
  label: string;
  Icon: NavIconComponent;
  page?: AppSidebarPageId;
  settings?: SettingsSectionId;
};
type MoreMenuGroup = {
  title: string;
  items: MoreMenuItem[];
};

const navItems = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "patients", label: "Patients", Icon: PatientIcon },
  { id: "bookings", label: "Bookings", Icon: BookingIcon },
  { id: "catalog", label: "Catalog", Icon: CatalogIcon },
  { id: "more", label: "More", Icon: MoreIcon },
] satisfies NavItem[];

const settingsItem = { id: "settings", label: "Settings", Icon: SettingIcon } satisfies NavItem;

const selectablePages = new Set<AppSidebarPageId>(["home", "patients", "bookings", "catalog", "more", "settings"]);

const moreMenuGroups = [
  {
    title: "GENERAL",
    items: [
      { label: "Dashboard", Icon: CatalogIcon, page: "home" },
      { label: "Inbox", Icon: BellIcon, page: "more" },
      { label: "Calendar", Icon: CalendarIcon, page: "more" },
      { label: "Tasks", Icon: CheckIcon, page: "more" },
    ],
  },
  {
    title: "CLINICAL",
    items: [
      { label: "Telehealth", Icon: TeleConsultationIcon, page: "more" },
      { label: "Care plans", Icon: HeartIcon, page: "more" },
      { label: "Pharma calls", Icon: NoteIcon, page: "more" },
    ],
  },
  {
    title: "PHARMACY",
    items: [
      { label: "Dispensary", Icon: PillIcon, page: "more" },
      { label: "Supplies", Icon: TubeIcon, page: "more" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "Billing & Payments", Icon: CreditCardIcon, settings: "billing" },
      { label: "Refer & earn", Icon: ShareIcon, page: "more" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Directory profile", Icon: CorporateIcon, settings: "directory" },
      { label: "e-Signature", Icon: IDCardIcon, settings: "esign" },
    ],
  },
] satisfies MoreMenuGroup[];

export type AppSidebarProps = {
  activePage: AppSidebarPageId;
  onPageChange: (page: AppSidebarPageId) => void;
  onOpenSearch: () => void;
  onOpenSettings: (section: SettingsSectionId) => void;
};

function NavIcon({
  Icon,
  active = false,
  activeVariant = "bulk",
  className = "",
  restVariant = "stroke",
  size = 24,
}: {
  Icon: NavIconComponent;
  active?: boolean;
  activeVariant?: IconStyle;
  className?: string;
  restVariant?: IconStyle;
  size?: number;
}) {
  return (
    <span aria-hidden className={`nav-icon ${className}`}>
      <Icon size={size} variant={active ? activeVariant : restVariant} />
    </span>
  );
}

function Logo() {
  return (
    <div className="kura-logo" aria-label="Kura">
      <Image className="logo-mark" src="/figma/logo-mark.svg" alt="" width={20.157} height={16.81} priority />
      <Image className="logo-type" src="/figma/logo-type.svg" alt="" width={30.831} height={11.684} priority />
    </div>
  );
}

export function AppSidebar({
  activePage,
  onPageChange,
  onOpenSearch,
  onOpenSettings,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <Logo />
      <nav className="sidebar-list">
        {navItems.map((item) =>
          item.id === "more" ? (
            <SidebarMoreMenu
              active={activePage === item.id}
              key={item.id}
              onOpenSettings={onOpenSettings}
              onPageChange={onPageChange}
            />
          ) : (
            <NavItemButton
              active={activePage === item.id}
              item={item}
              key={item.id}
              onOpenSearch={onOpenSearch}
              onPageChange={onPageChange}
            />
          ),
        )}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <NavItemButton
          active={activePage === settingsItem.id}
          item={settingsItem}
          onOpenSearch={onOpenSearch}
          onPageChange={onPageChange}
        />
        <AccountMenu onOpenSettings={onOpenSettings} />
      </div>
    </aside>
  );
}

function SidebarMoreMenu({
  active,
  onOpenSettings,
  onPageChange,
}: {
  active: boolean;
  onOpenSettings: (section: SettingsSectionId) => void;
  onPageChange: (page: AppSidebarPageId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [geometry, setGeometry] = useState({ menuTop: 220, safeTop: 220, safeHeight: 271, safeY: 50 });
  const closeTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 720;
    const menuHeight = 271;
    const triggerTop = rect?.top ?? 360;
    const triggerBottom = rect?.bottom ?? triggerTop + 56;
    const triggerMid = triggerTop + (rect?.height ?? 56) / 2;
    const menuTop = Math.min(Math.max(triggerMid - 140, 20), Math.max(20, viewportHeight - menuHeight - 20));
    const safeTop = Math.min(menuTop, triggerTop - 12);
    const safeBottom = Math.max(menuTop + menuHeight, triggerBottom + 12);
    const safeHeight = safeBottom - safeTop;
    const safeY = Math.min(82, Math.max(18, ((triggerMid - safeTop) / safeHeight) * 100));

    setGeometry({ menuTop, safeTop, safeHeight, safeY });
  }, []);

  const openMenu = () => {
    clearCloseTimer();
    measure();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => measure();

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [measure, open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const goTo = (item: MoreMenuItem) => {
    setOpen(false);
    if (item.settings) {
      onOpenSettings(item.settings);
      return;
    }
    onPageChange(item.page ?? "more");
  };

  return (
    <div
      className="sidebar-more"
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
      ref={rootRef}
    >
      <button
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`rail-item${active || open ? " active" : ""}`}
        data-page="more"
        onClick={openMenu}
        onPointerEnter={openMenu}
        ref={triggerRef}
        type="button"
      >
        <NavIcon Icon={MoreIcon} active={active || open} activeVariant="solid" restVariant="stroke" />
        <span>More</span>
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="sidebar-more-safe-zone"
            style={
              {
                "--safe-y": `${geometry.safeY}%`,
                height: `${geometry.safeHeight}px`,
                top: `${geometry.safeTop}px`,
              } as CSSProperties
            }
          />
          <div
            aria-label="More navigation"
            className="sidebar-more-menu"
            role="menu"
            style={{ top: geometry.menuTop } as CSSProperties}
          >
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[0]} onSelect={goTo} />
            </div>
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[1]} onSelect={goTo} />
              <MoreMenuSection group={moreMenuGroups[2]} onSelect={goTo} />
            </div>
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[3]} onSelect={goTo} />
              <MoreMenuSection group={moreMenuGroups[4]} onSelect={goTo} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoreMenuSection({
  group,
  onSelect,
}: {
  group: MoreMenuGroup;
  onSelect: (item: MoreMenuItem) => void;
}) {
  return (
    <section className="sidebar-more-section" aria-label={group.title}>
      <h2>{group.title}</h2>
      <div className="sidebar-more-items">
        {group.items.map((item) => (
          <button className="sidebar-more-item" key={item.label} onClick={() => onSelect(item)} role="menuitem" type="button">
            <span aria-hidden className="sidebar-more-item-icon">
              <item.Icon size={20} variant="stroke" />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AccountMenu({ onOpenSettings }: { onOpenSettings: (section: SettingsSectionId) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goTo = (section: SettingsSectionId) => {
    setOpen(false);
    onOpenSettings(section);
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="avatar account-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        PT
      </button>
      {open && (
        <div className="account-pop" role="menu">
          <div className="account-pop-id">
            <Avatar name="Phong Tuy" size="sm" tone="success" />
            <div className="account-pop-copy">
              <strong>Dr. Phong Tuy</strong>
              <span>leon@kura.med</span>
            </div>
            <Badge tone="success">Verified</Badge>
          </div>
          <ActionList
            sections={[
              {
                items: [
                  { label: "Profile", onClick: () => goTo("account") },
                  {
                    label: (
                      <span className="account-item-row">
                        Settings <kbd>⌘,</kbd>
                      </span>
                    ),
                    onClick: () => goTo("overview"),
                  },
                  { label: "Billing & payments", onClick: () => goTo("billing") },
                ],
              },
              {
                items: [{ destructive: true, label: "Log out", onClick: () => setOpen(false) }],
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function NavItemButton({
  active,
  item,
  onOpenSearch,
  onPageChange,
}: {
  active: boolean;
  item: NavItem;
  onOpenSearch: () => void;
  onPageChange: (page: AppSidebarPageId) => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-disabled={item.disabled ? true : undefined}
      className={`rail-item${active ? " active" : ""}`}
      data-page={item.id}
      disabled={item.disabled}
      onClick={() => {
        if (item.id === "search") {
          onOpenSearch();
          return;
        }

        if (selectablePages.has(item.id)) {
          onPageChange(item.id);
        }
      }}
      type="button"
    >
      <NavIcon
        Icon={item.Icon}
        active={active}
        activeVariant={item.activeVariant}
        restVariant={item.restVariant}
      />
      <span>{item.label}</span>
    </button>
  );
}
