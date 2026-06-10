import { useMemo, useState } from "react";
import {
  Table,
  Calendar,
  Sidebar,
  Header,
  HeaderSearch,
  HeaderIconButton,
  FilterButton,
  FilterPanel,
  FilterSection,
  Pagination,
  Avatar,
  Badge,
  Button,
  ChoiceList,
  SegmentedToggle,
} from "@/components/ui";
import type { Column, DateRange } from "@/components/ui";
import {
  Bell,
  Home,
  Search,
  Patient,
  Booking,
  Catalog,
  More,
  Setting,
  KuraLogo,
} from "@/icons";
import { Section, Subsection, Row, Stack } from "../DemoKit";

interface Patient {
  id: string;
  name: string;
  sub: string;
  phone: string;
  age: number;
  lastSeen: string;
  status: { tone: "success" | "warning" | "danger" | "neutral"; label: string };
}

const PATIENTS: Patient[] = [
  { id: "1", name: "Sokha Chann", sub: "P-10293", phone: "012 345 678", age: 34, lastSeen: "2 days ago", status: { tone: "success", label: "Stable" } },
  { id: "2", name: "Dara Pich", sub: "P-10288", phone: "077 222 145", age: 58, lastSeen: "5 hours ago", status: { tone: "warning", label: "Review" } },
  { id: "3", name: "Maly Sok", sub: "P-10277", phone: "010 998 221", age: 41, lastSeen: "1 week ago", status: { tone: "danger", label: "Urgent" } },
  { id: "4", name: "Rithy Keo", sub: "P-10254", phone: "096 552 010", age: 27, lastSeen: "Yesterday", status: { tone: "success", label: "Stable" } },
  { id: "5", name: "Bopha Lim", sub: "P-10231", phone: "089 145 663", age: 63, lastSeen: "3 days ago", status: { tone: "neutral", label: "Discharged" } },
];

export function TableSection() {
  const [selected, setSelected] = useState<string[]>(["2"]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const data = useMemo(() => {
    const sorted = [...PATIENTS].sort((a, b) => {
      const av = a[sortKey as "name" | "age"];
      const bv = b[sortKey as "name" | "age"];
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [sortKey, sortDir]);

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Patient",
      sortable: true,
      render: (p) => (
        <div className="kui-cell-user">
          <Avatar name={p.name} size="sm" />
          <div>
            <div className="kui-cell-user__name">{p.name}</div>
            <div className="kui-cell-user__sub">{p.sub}</div>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone" },
    { key: "age", header: "Age", align: "right", sortable: true },
    { key: "lastSeen", header: "Last seen" },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge tone={p.status.tone} dot>
          {p.status.label}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: () => (
        <Button size="sm" intent="ghost">
          Details
        </Button>
      ),
    },
  ];

  return (
    <Section
      id="table"
      title="Table"
      description="Sortable headers, row selection (with select-all + indeterminate), custom cell renderers, hover, loading skeleton and empty state. Comfortable / compact density."
    >
      <Table
        columns={columns}
        data={data}
        getRowId={(p) => p.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(k, d) => {
          setSortKey(k);
          setSortDir(d);
        }}
        footer={
          <Pagination
            page={page}
            total={124}
            pageSize={8}
            onPageChange={setPage}
            itemName="patients"
          />
        }
      />
    </Section>
  );
}

export function CalendarSection() {
  const [day, setDay] = useState<Date | null>(new Date());
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  return (
    <Section
      id="calendar"
      title="Calendar"
      description="Month grid with navigation, today marker, outside days and disabled days. Single-date or range selection."
    >
      <Row gap={32}>
        <div>
          <Subsection title="Single">
            <Calendar value={day} onChange={setDay} />
          </Subsection>
        </div>
        <div>
          <Subsection title="Range">
            <Calendar mode="range" value={range} onChange={setRange} />
          </Subsection>
        </div>
      </Row>
    </Section>
  );
}

export function SidebarSection() {
  return (
    <Section
      id="sidebar"
      title="Sidebar"
      description="Collapsed app navigation rail (72px) — stacked icon + 10px label items. The active item uses Brand/25 with brand text; the logo sits on top, with Settings and the account pinned to the bottom."
    >
      <div
        style={{
          height: 520,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px var(--color-border)",
          display: "inline-block",
        }}
      >
        <Sidebar
          items={[
            { label: "Home", icon: <Home /> },
            { label: "Search", icon: <Search /> },
            { label: "Patients", icon: <Patient />, active: true },
            { label: "Bookings", icon: <Booking /> },
            { label: "Catalog", icon: <Catalog /> },
            { label: "More", icon: <More /> },
          ]}
          bottomItems={[{ label: "Settings", icon: <Setting /> }]}
          footer={<Avatar name="Phana Tep" tone="success" size="sm" />}
        />
      </div>
    </Section>
  );
}

export function HeaderSection() {
  return (
    <Section
      id="header"
      title="Header"
      description="Dark brand app bar (Brand/800) with a wordmark, a translucent center search and right-side icon actions."
    >
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--color-border)" }}>
        <Header
          logo={<KuraLogo />}
          center={<HeaderSearch placeholder="Search patients, orders, labs" />}
          actions={
            <HeaderIconButton aria-label="Notifications">
              <Bell />
            </HeaderIconButton>
          }
        />
      </div>
    </Section>
  );
}

export function FilterSectionDemo() {
  const [open, setOpen] = useState(true);
  const [match, setMatch] = useState("any");
  const [conditions, setConditions] = useState<string[]>(["t2d", "ckd"]);
  return (
    <Section
      id="filter"
      title="Filter primitives"
      description="A filter trigger button (with active count) and a popover panel — header + reset, sectioned body and a footer with a match toggle and apply button."
    >
      <Subsection title="Trigger — rest / active">
        <Row gap={12}>
          <FilterButton count={2} />
          <FilterButton count={2} active />
        </Row>
      </Subsection>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <FilterButton count={conditions.length} active={open} onClick={() => setOpen((v) => !v)} />
        {open && (
          <FilterPanel
            onReset={() => setConditions([])}
            footer={
              <>
                <SegmentedToggle
                  value={match}
                  onChange={setMatch}
                  options={[
                    { label: "Match any", value: "any" },
                    { label: "Match all", value: "all" },
                  ]}
                />
                <Button size="sm" intent="primary">
                  Show 64 patients
                </Button>
              </>
            }
          >
            <FilterSection title="Condition">
              <ChoiceList
                multiple
                value={conditions}
                onChange={setConditions}
                options={[
                  { label: "Type 2 Diabetes (511)", value: "t2d" },
                  { label: "Hypertension (310)", value: "htn" },
                  { label: "Chronic kidney disease (118)", value: "ckd" },
                  { label: "COPD (44)", value: "copd" },
                ]}
              />
            </FilterSection>
          </FilterPanel>
        )}
      </div>
    </Section>
  );
}

export function PaginationSection() {
  const [page, setPage] = useState(3);
  return (
    <Section
      id="pagination"
      title="Pagination"
      description="Table / list footer — a range summary on the left and page controls on the right. The current page tints Brand-50; long ranges truncate with an ellipsis. Hidden when everything fits one page."
    >
      <Stack gap={20}>
        <div
          style={{
            width: 680,
            maxWidth: "100%",
            padding: "12px 16px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <Pagination
            page={page}
            total={124}
            pageSize={8}
            onPageChange={setPage}
            itemName="patients"
          />
        </div>
        <Subsection title="Controls only (no summary)">
          <Pagination
            page={page}
            pageCount={5}
            onPageChange={setPage}
            showSummary={false}
          />
        </Subsection>
      </Stack>
    </Section>
  );
}
