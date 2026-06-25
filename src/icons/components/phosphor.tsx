import {
  ArrowClockwise as PhArrowClockwise,
  ArrowDown as PhArrowDown,
  ArrowDownLeft as PhArrowDownLeft,
  ArrowDownRight as PhArrowDownRight,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowUp as PhArrowUp,
  ArrowUpLeft as PhArrowUpLeft,
  ArrowUpRight as PhArrowUpRight,
  ArrowsInSimple as PhArrowsInSimple,
  ArrowsOutSimple as PhArrowsOutSimple,
  Bell as PhBell,
  Book as PhBook,
  BookOpenText as PhBookOpenText,
  Buildings as PhBuildings,
  Calendar as PhCalendar,
  CalendarCheck as PhCalendarCheck,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhChecks,
  Clock as PhClock,
  CreditCard as PhCreditCard,
  DotsThreeVertical as PhDotsThreeVertical,
  Download as PhDownload,
  Drop as PhDrop,
  DropHalf as PhDropHalf,
  FaceMask as PhFaceMask,
  Flask as PhFlask,
  Funnel as PhFunnel,
  GearSix as PhGearSix,
  GenderMale as PhGenderMale,
  Heart as PhHeart,
  Heartbeat as PhHeartbeat,
  House as PhHouse,
  IdentificationCard as PhIdentificationCard,
  Info as PhInfo,
  Key as PhKey,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  Minus as PhMinus,
  Money as PhMoney,
  NotePencil as PhNotePencil,
  PencilSimple as PhPencilSimple,
  PhoneCall as PhPhoneCall,
  Pill as PhPill,
  Plus as PhPlus,
  PushPin as PhPushPin,
  Receipt as PhReceipt,
  Scan as PhScan,
  ShareNetwork as PhShareNetwork,
  ShieldCheck as PhShieldCheck,
  ShoppingCart as PhShoppingCart,
  SidebarSimple as PhSidebarSimple,
  SortDescending as PhSortDescending,
  Sparkle as PhSparkle,
  Star as PhStar,
  Stethoscope as PhStethoscope,
  TestTube as PhTestTube,
  Trash as PhTrash,
  Upload as PhUpload,
  User as PhUser,
  UserCircle as PhUserCircle,
  UserList as PhUserList,
  UsersThree as PhUsersThree,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  X as PhX,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import type { IconProps, IconStyle } from "./types";

function weightForVariant(variant?: IconStyle): IconWeight {
  switch (variant) {
    case "bulk":
    case "bulk 2":
    case "duotone":
    case "solid":
    case "twotone":
    case "twotone 2":
      return "duotone";
    case "stroke 2":
      return "bold";
    case "stroke":
    default:
      return "regular";
  }
}

function makeIcon(displayName: string, Phosphor: PhosphorIcon, options?: { mirrored?: boolean }) {
  const Icon = ({ size = 24, variant, ...props }: IconProps) => (
    <Phosphor
      size={size}
      weight={weightForVariant(variant)}
      mirrored={options?.mirrored}
      {...props}
    />
  );

  Icon.displayName = displayName;
  return Icon;
}

export const ArrowDown = makeIcon("ArrowDown", PhArrowDown);
export const ArrowDownLeft = makeIcon("ArrowDownLeft", PhArrowDownLeft);
export const ArrowDownRight = makeIcon("ArrowDownRight", PhArrowDownRight);
export const ArrowLeft = makeIcon("ArrowLeft", PhArrowLeft);
export const ArrowRight = makeIcon("ArrowRight", PhArrowRight);
export const ArrowUp = makeIcon("ArrowUp", PhArrowUp);
export const ArrowUpLeft = makeIcon("ArrowUpLeft", PhArrowUpLeft);
export const ArrowUpRight = makeIcon("ArrowUpRight", PhArrowUpRight);
export const Bell = makeIcon("Bell", PhBell);
export const BloodDrop = makeIcon("BloodDrop", PhDrop);
export const Booking = makeIcon("Booking", PhCalendarCheck);
export const Calendar = makeIcon("Calendar", PhCalendar);
export const Cart = makeIcon("Cart", PhShoppingCart);
export const Cash = makeIcon("Cash", PhMoney);
export const Catalog = makeIcon("Catalog", PhBookOpenText);
export const Check = makeIcon("Check", PhCheck);
export const CheckCircle = makeIcon("CheckCircle", PhCheckCircle);
export const CheckShield = makeIcon("CheckShield", PhShieldCheck);
export const CheckwCircle = makeIcon("CheckwCircle", PhCheckCircle);
export const CheckwCircle2 = makeIcon("CheckwCircle2", PhChecks);
export const ChevronDown = makeIcon("ChevronDown", PhCaretDown);
export const ChevronLeft = makeIcon("ChevronLeft", PhCaretLeft);
export const ChevronRight = makeIcon("ChevronRight", PhCaretRight);
export const ChevronUp = makeIcon("ChevronUp", PhCaretUp);
export const Clock = makeIcon("Clock", PhClock);
export const Close = makeIcon("Close", PhX);
export const Collapse1 = makeIcon("Collapse1", PhArrowsInSimple);
export const Collapsed = makeIcon("Collapsed", PhSidebarSimple);
export const Collapsed2 = makeIcon("Collapsed2", PhArrowsInSimple);
export const Corporate = makeIcon("Corporate", PhBuildings);
export const CreditCard = makeIcon("CreditCard", PhCreditCard);
export const Delete = makeIcon("Delete", PhTrash);
export const Edit = makeIcon("Edit", PhPencilSimple);
export const Expand1 = makeIcon("Expand1", PhArrowsOutSimple);
export const Expand2 = makeIcon("Expand2", PhArrowsOutSimple);
export const Filter = makeIcon("Filter", PhFunnel);
export const Flask = makeIcon("Flask", PhFlask);
export const Heart = makeIcon("Heart", PhHeart);
export const Home = makeIcon("Home", PhHouse);
export const Hormone = makeIcon("Hormone", PhHeartbeat);
export const IDCard = makeIcon("IDCard", PhIdentificationCard);
export const Info = makeIcon("Info", PhInfo);
export const Kidney = makeIcon("Kidney", PhStethoscope);
export const Lock = makeIcon("Lock", PhLock);
export const Male = makeIcon("Male", PhGenderMale);
export const MedicalMask = makeIcon("MedicalMask", PhFaceMask);
export const Minus = makeIcon("Minus", PhMinus);
export const More = makeIcon("More", PhDotsThreeVertical);
export const Note = makeIcon("Note", PhNotePencil);
export const Patient = makeIcon("Patient", PhUsersThree);
export const Pill = makeIcon("Pill", PhPill);
export const Pin = makeIcon("Pin", PhPushPin);
export const Plus = makeIcon("Plus", PhPlus);
export const Receipt = makeIcon("Receipt", PhReceipt);
export const Refresh = makeIcon("Refresh", PhArrowClockwise);
export const Scan = makeIcon("Scan", PhScan);
export const Search = makeIcon("Search", PhMagnifyingGlass);
export const Setting = makeIcon("Setting", PhGearSix);
export const Share = makeIcon("Share", PhShareNetwork);
export const SortDescending = makeIcon("SortDescending", PhSortDescending);
export const TeleConsultation = makeIcon("TeleConsultation", PhPhoneCall);
export const Tube = makeIcon("Tube", PhTestTube);
export const Upload = makeIcon("Upload", PhUpload);
export const User = makeIcon("User", PhUser);
export const Warning = makeIcon("Warning", PhWarning);

export const AlertCircle = makeIcon("AlertCircle", PhWarningCircle);
export const Book = makeIcon("Book", PhBook);
export const Download = makeIcon("Download", PhDownload);
export const Sparkles = makeIcon("Sparkles", PhSparkle);
export const Star = makeIcon("Star", PhStar);
export const Users = makeIcon("Users", PhUserList);
export const UserCircle = makeIcon("UserCircle", PhUserCircle);
export const Key = makeIcon("Key", PhKey);
export const DropHalf = makeIcon("DropHalf", PhDropHalf);
