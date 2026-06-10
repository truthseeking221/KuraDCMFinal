import type { ReactNode } from "react";
import { Foundations } from "./sections/Foundations";
import { Buttons } from "./sections/Buttons";
import {
  BadgeSection,
  ChipSection,
  CounterSection,
} from "./sections/BadgeChipCounter";
import { AvatarSection, TooltipSection } from "./sections/AvatarTooltip";
import {
  CheckboxSection,
  ChoiceListSection,
  SegmentedSection,
} from "./sections/SelectionControls";
import {
  BannerSection,
  CardSectionDemo,
  CalloutCardSection,
} from "./sections/BannersCards";
import {
  InputSection,
  TabsSection,
  ButtonGroupSection,
  BreadcrumbSection,
  ActionListSection,
} from "./sections/FormsNav";
import {
  TableSection,
  CalendarSection,
  SidebarSection,
  HeaderSection,
  FilterSectionDemo,
  PaginationSection,
} from "./sections/Complex";
import { LabHistorySection } from "./sections/LabHistoryDemo";

export interface ShowcaseEntry {
  id: string;
  label: string;
  group: "Foundations" | "Components" | "Compositions";
  element: ReactNode;
}

/** Single source of truth for both the sidebar nav and the rendered sections.
 *  Add a component = add one section file + one line here. */
export const REGISTRY: ShowcaseEntry[] = [
  { id: "foundations", label: "Foundations", group: "Foundations", element: <Foundations /> },
  { id: "button", label: "Button", group: "Components", element: <Buttons /> },
  { id: "badge", label: "Badge", group: "Components", element: <BadgeSection /> },
  { id: "chip", label: "Chip", group: "Components", element: <ChipSection /> },
  { id: "counter", label: "Counter", group: "Components", element: <CounterSection /> },
  { id: "avatar", label: "Avatar", group: "Components", element: <AvatarSection /> },
  { id: "tooltip", label: "Tooltip", group: "Components", element: <TooltipSection /> },
  { id: "checkbox", label: "Checkbox", group: "Components", element: <CheckboxSection /> },
  { id: "choicelist", label: "ChoiceList", group: "Components", element: <ChoiceListSection /> },
  { id: "segmented", label: "Segmented toggle", group: "Components", element: <SegmentedSection /> },
  { id: "banner", label: "Banner", group: "Components", element: <BannerSection /> },
  { id: "card", label: "Card", group: "Components", element: <CardSectionDemo /> },
  { id: "calloutcard", label: "CalloutCard", group: "Components", element: <CalloutCardSection /> },
  { id: "input", label: "Input & Search", group: "Components", element: <InputSection /> },
  { id: "tabs", label: "Tabs", group: "Components", element: <TabsSection /> },
  { id: "buttongroup", label: "ButtonGroup", group: "Components", element: <ButtonGroupSection /> },
  { id: "breadcrumb", label: "Breadcrumb", group: "Components", element: <BreadcrumbSection /> },
  { id: "actionlist", label: "Action List", group: "Components", element: <ActionListSection /> },
  { id: "table", label: "Table", group: "Compositions", element: <TableSection /> },
  { id: "calendar", label: "Calendar", group: "Compositions", element: <CalendarSection /> },
  { id: "sidebar", label: "Sidebar", group: "Compositions", element: <SidebarSection /> },
  { id: "header", label: "Header", group: "Compositions", element: <HeaderSection /> },
  { id: "filter", label: "Filter primitives", group: "Compositions", element: <FilterSectionDemo /> },
  { id: "pagination", label: "Pagination", group: "Compositions", element: <PaginationSection /> },
  { id: "labhistory", label: "Lab history", group: "Compositions", element: <LabHistorySection /> },
];
