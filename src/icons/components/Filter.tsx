import type { IconProps } from "./types";

const templates = {
  "bulk 2": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M14 3.33337C14.3682 3.33337 14.6667 3.63185 14.6667 4.00004C14.6667 4.36823 14.3682 4.66671 14 4.66671H2.00004C1.63185 4.66671 1.33337 4.36823 1.33337 4.00004C1.33337 3.63185 1.63185 3.33337 2.00004 3.33337H14Z" fill="currentColor"/>
          <path d="M12 7.33337C12.3682 7.33337 12.6667 7.63184 12.6667 8.00004C12.6667 8.36824 12.3682 8.66671 12 8.66671H4.00004C3.63185 8.66671 3.33337 8.36824 3.33337 8.00004C3.33337 7.63184 3.63185 7.33337 4.00004 7.33337H12Z" fill="currentColor"/>
          <path opacity="0.4" d="M10 11.3334C10.3682 11.3334 10.6667 11.6318 10.6667 12C10.6667 12.3682 10.3682 12.6667 10 12.6667H6.00004C5.63185 12.6667 5.33337 12.3682 5.33337 12C5.33337 11.6318 5.63185 11.3334 6.00004 11.3334H10Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M17.5 4.16663C17.9602 4.16663 18.3333 4.53973 18.3333 4.99996C18.3333 5.46019 17.9602 5.83329 17.5 5.83329H2.49996C2.03973 5.83329 1.66663 5.46019 1.66663 4.99996C1.66663 4.53973 2.03973 4.16663 2.49996 4.16663H17.5Z" fill="currentColor"/>
          <path d="M15 9.16663C15.4602 9.16663 15.8333 9.53971 15.8333 9.99996C15.8333 10.4602 15.4602 10.8333 15 10.8333H4.99996C4.53973 10.8333 4.16663 10.4602 4.16663 9.99996C4.16663 9.53971 4.53973 9.16663 4.99996 9.16663H15Z" fill="currentColor"/>
          <path opacity="0.4" d="M12.5 14.1666C12.9602 14.1666 13.3333 14.5397 13.3333 15C13.3333 15.4602 12.9602 15.8333 12.5 15.8333H7.49996C7.03973 15.8333 6.66663 15.4602 6.66663 15C6.66663 14.5397 7.03973 14.1666 7.49996 14.1666H12.5Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M21 5C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H21Z" fill="currentColor"/>
          <path d="M18 11C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H6C5.44772 13 5 12.5523 5 12C5 11.4477 5.44772 11 6 11H18Z" fill="currentColor"/>
          <path opacity="0.4" d="M15 17C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H9C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17H15Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M24.5 5.83337C25.1444 5.83337 25.6667 6.35571 25.6667 7.00004C25.6667 7.64437 25.1444 8.16671 24.5 8.16671H3.50004C2.85571 8.16671 2.33337 7.64437 2.33337 7.00004C2.33337 6.35571 2.85571 5.83337 3.50004 5.83337H24.5Z" fill="currentColor"/>
          <path d="M21 12.8334C21.6444 12.8334 22.1667 13.3557 22.1667 14C22.1667 14.6444 21.6444 15.1667 21 15.1667H7.00004C6.35571 15.1667 5.83337 14.6444 5.83337 14C5.83337 13.3557 6.35571 12.8334 7.00004 12.8334H21Z" fill="currentColor"/>
          <path opacity="0.4" d="M17.5 19.8334C18.1444 19.8334 18.6667 20.3557 18.6667 21C18.6667 21.6444 18.1444 22.1667 17.5 22.1667H10.5C9.85571 22.1667 9.33337 21.6444 9.33337 21C9.33337 20.3557 9.85571 19.8334 10.5 19.8334H17.5Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M28 6.66663C28.7364 6.66663 29.3333 7.26359 29.3333 7.99996C29.3333 8.73633 28.7364 9.33329 28 9.33329H3.99996C3.26359 9.33329 2.66663 8.73633 2.66663 7.99996C2.66663 7.26359 3.26359 6.66663 3.99996 6.66663H28Z" fill="currentColor"/>
          <path d="M24 14.6666C24.7364 14.6666 25.3333 15.2636 25.3333 16C25.3333 16.7364 24.7364 17.3333 24 17.3333H7.99996C7.26359 17.3333 6.66663 16.7364 6.66663 16C6.66663 15.2636 7.26359 14.6666 7.99996 14.6666H24Z" fill="currentColor"/>
          <path opacity="0.4" d="M20 22.6666C20.7364 22.6666 21.3333 23.2636 21.3333 24C21.3333 24.7364 20.7364 25.3333 20 25.3333H12C11.2636 25.3333 10.6666 24.7364 10.6666 24C10.6666 23.2636 11.2636 22.6666 12 22.6666H20Z" fill="currentColor"/>
        </>
      )
    },
  },
  "bulk": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M14 3.33337C14.3682 3.33337 14.6667 3.63185 14.6667 4.00004C14.6667 4.36823 14.3682 4.66671 14 4.66671H2.00004C1.63185 4.66671 1.33337 4.36823 1.33337 4.00004C1.33337 3.63185 1.63185 3.33337 2.00004 3.33337H14Z" fill="currentColor"/>
          <path d="M12 7.33337C12.3682 7.33337 12.6667 7.63184 12.6667 8.00004C12.6667 8.36824 12.3682 8.66671 12 8.66671H4.00004C3.63185 8.66671 3.33337 8.36824 3.33337 8.00004C3.33337 7.63184 3.63185 7.33337 4.00004 7.33337H12Z" fill="currentColor"/>
          <path d="M10 11.3334C10.3682 11.3334 10.6667 11.6318 10.6667 12C10.6667 12.3682 10.3682 12.6667 10 12.6667H6.00004C5.63185 12.6667 5.33337 12.3682 5.33337 12C5.33337 11.6318 5.63185 11.3334 6.00004 11.3334H10Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M17.5 4.16663C17.9602 4.16663 18.3333 4.53973 18.3333 4.99996C18.3333 5.46019 17.9602 5.83329 17.5 5.83329H2.49996C2.03973 5.83329 1.66663 5.46019 1.66663 4.99996C1.66663 4.53973 2.03973 4.16663 2.49996 4.16663H17.5Z" fill="currentColor"/>
          <path d="M15 9.16663C15.4602 9.16663 15.8333 9.53971 15.8333 9.99996C15.8333 10.4602 15.4602 10.8333 15 10.8333H4.99996C4.53973 10.8333 4.16663 10.4602 4.16663 9.99996C4.16663 9.53971 4.53973 9.16663 4.99996 9.16663H15Z" fill="currentColor"/>
          <path d="M12.5 14.1666C12.9602 14.1666 13.3333 14.5397 13.3333 15C13.3333 15.4602 12.9602 15.8333 12.5 15.8333H7.49996C7.03973 15.8333 6.66663 15.4602 6.66663 15C6.66663 14.5397 7.03973 14.1666 7.49996 14.1666H12.5Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M21 5C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H21Z" fill="currentColor"/>
          <path d="M18 11C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H6C5.44772 13 5 12.5523 5 12C5 11.4477 5.44772 11 6 11H18Z" fill="currentColor"/>
          <path d="M15 17C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H9C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17H15Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M24.5 5.83337C25.1444 5.83337 25.6667 6.35571 25.6667 7.00004C25.6667 7.64437 25.1444 8.16671 24.5 8.16671H3.50004C2.85571 8.16671 2.33337 7.64437 2.33337 7.00004C2.33337 6.35571 2.85571 5.83337 3.50004 5.83337H24.5Z" fill="currentColor"/>
          <path d="M21 12.8334C21.6444 12.8334 22.1667 13.3557 22.1667 14C22.1667 14.6444 21.6444 15.1667 21 15.1667H7.00004C6.35571 15.1667 5.83337 14.6444 5.83337 14C5.83337 13.3557 6.35571 12.8334 7.00004 12.8334H21Z" fill="currentColor"/>
          <path d="M17.5 19.8334C18.1444 19.8334 18.6667 20.3557 18.6667 21C18.6667 21.6444 18.1444 22.1667 17.5 22.1667H10.5C9.85571 22.1667 9.33337 21.6444 9.33337 21C9.33337 20.3557 9.85571 19.8334 10.5 19.8334H17.5Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M28 6.66663C28.7364 6.66663 29.3333 7.26359 29.3333 7.99996C29.3333 8.73633 28.7364 9.33329 28 9.33329H3.99996C3.26359 9.33329 2.66663 8.73633 2.66663 7.99996C2.66663 7.26359 3.26359 6.66663 3.99996 6.66663H28Z" fill="currentColor"/>
          <path d="M24 14.6666C24.7364 14.6666 25.3333 15.2636 25.3333 16C25.3333 16.7364 24.7364 17.3333 24 17.3333H7.99996C7.26359 17.3333 6.66663 16.7364 6.66663 16C6.66663 15.2636 7.26359 14.6666 7.99996 14.6666H24Z" fill="currentColor"/>
          <path d="M20 22.6666C20.7364 22.6666 21.3333 23.2636 21.3333 24C21.3333 24.7364 20.7364 25.3333 20 25.3333H12C11.2636 25.3333 10.6666 24.7364 10.6666 24C10.6666 23.2636 11.2636 22.6666 12 22.6666H20Z" fill="currentColor"/>
        </>
      )
    },
  },
  "solid": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M14 3.33331C14.3682 3.33331 14.6667 3.63179 14.6667 3.99998C14.6667 4.36817 14.3682 4.66665 14 4.66665H2.00004C1.63185 4.66665 1.33337 4.36817 1.33337 3.99998C1.33337 3.63179 1.63185 3.33331 2.00004 3.33331H14Z" fill="currentColor"/>
          <path d="M12 7.33331C12.3682 7.33331 12.6667 7.63178 12.6667 7.99998C12.6667 8.36818 12.3682 8.66665 12 8.66665H4.00004C3.63185 8.66665 3.33337 8.36818 3.33337 7.99998C3.33337 7.63178 3.63185 7.33331 4.00004 7.33331H12Z" fill="currentColor"/>
          <path d="M10 11.3333C10.3682 11.3333 10.6667 11.6318 10.6667 12C10.6667 12.3682 10.3682 12.6666 10 12.6666H6.00004C5.63185 12.6666 5.33337 12.3682 5.33337 12C5.33337 11.6318 5.63185 11.3333 6.00004 11.3333H10Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M17.5 4.16669C17.9602 4.16669 18.3333 4.53979 18.3333 5.00002C18.3333 5.46025 17.9602 5.83335 17.5 5.83335H2.49996C2.03973 5.83335 1.66663 5.46025 1.66663 5.00002C1.66663 4.53979 2.03973 4.16669 2.49996 4.16669H17.5Z" fill="currentColor"/>
          <path d="M15 9.16669C15.4602 9.16669 15.8333 9.53977 15.8333 10C15.8333 10.4603 15.4602 10.8334 15 10.8334H4.99996C4.53973 10.8334 4.16663 10.4603 4.16663 10C4.16663 9.53977 4.53973 9.16669 4.99996 9.16669H15Z" fill="currentColor"/>
          <path d="M12.5 14.1667C12.9602 14.1667 13.3333 14.5398 13.3333 15C13.3333 15.4603 12.9602 15.8334 12.5 15.8334H7.49996C7.03973 15.8334 6.66663 15.4603 6.66663 15C6.66663 14.5398 7.03973 14.1667 7.49996 14.1667H12.5Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M21 5C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6C2 5.44772 2.44772 5 3 5H21Z" fill="currentColor"/>
          <path d="M18 11C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H6C5.44772 13 5 12.5523 5 12C5 11.4477 5.44772 11 6 11H18Z" fill="currentColor"/>
          <path d="M15 17C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H9C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17H15Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M24.5 5.83331C25.1444 5.83331 25.6667 6.35565 25.6667 6.99998C25.6667 7.64431 25.1444 8.16665 24.5 8.16665H3.50004C2.85571 8.16665 2.33337 7.64431 2.33337 6.99998C2.33337 6.35565 2.85571 5.83331 3.50004 5.83331H24.5Z" fill="currentColor"/>
          <path d="M21 12.8333C21.6444 12.8333 22.1667 13.3556 22.1667 14C22.1667 14.6443 21.6444 15.1666 21 15.1666H7.00004C6.35571 15.1666 5.83337 14.6443 5.83337 14C5.83337 13.3556 6.35571 12.8333 7.00004 12.8333H21Z" fill="currentColor"/>
          <path d="M17.5 19.8333C18.1444 19.8333 18.6667 20.3556 18.6667 21C18.6667 21.6443 18.1444 22.1666 17.5 22.1666H10.5C9.85571 22.1666 9.33337 21.6443 9.33337 21C9.33337 20.3556 9.85571 19.8333 10.5 19.8333H17.5Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M28 6.66669C28.7364 6.66669 29.3333 7.26365 29.3333 8.00002C29.3333 8.73639 28.7364 9.33335 28 9.33335H3.99996C3.26359 9.33335 2.66663 8.73639 2.66663 8.00002C2.66663 7.26365 3.26359 6.66669 3.99996 6.66669H28Z" fill="currentColor"/>
          <path d="M24 14.6667C24.7364 14.6667 25.3333 15.2636 25.3333 16C25.3333 16.7364 24.7364 17.3334 24 17.3334H7.99996C7.26359 17.3334 6.66663 16.7364 6.66663 16C6.66663 15.2636 7.26359 14.6667 7.99996 14.6667H24Z" fill="currentColor"/>
          <path d="M20 22.6667C20.7364 22.6667 21.3333 23.2636 21.3333 24C21.3333 24.7364 20.7364 25.3334 20 25.3334H12C11.2636 25.3334 10.6666 24.7364 10.6666 24C10.6666 23.2636 11.2636 22.6667 12 22.6667H20Z" fill="currentColor"/>
        </>
      )
    },
  },
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M2 4H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 8H12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12H10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M2.5 5H17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10H15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7.5 15H12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 18H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M3.5 7H24.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 14H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.5 21H17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M4 8H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 24H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M2 4H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 8H12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M6 12H10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M2.5 5H17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10H15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M7.5 15H12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M3 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M9 18H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M3.5 7H24.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 14H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M10.5 21H17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M4 8H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M12 24H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Filter = ({ size = 24, variant, ...props }: IconProps) => {
  const availableVariants = Object.keys(templates);
  const selectedVariant = (variant && availableVariants.includes(variant) ? variant : availableVariants[0]) as keyof typeof templates;
  
  const variantTemplates = templates[selectedVariant];
  const availableSizes = Object.keys(variantTemplates).map(Number);
  
  // Find closest size
  const numSize = typeof size === "number" ? size : parseInt(String(size), 10);
  const targetSize = isNaN(numSize) ? 24 : numSize;
  const closestSize = availableSizes.reduce((prev, curr) => 
    Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev
  , availableSizes[0]);
  
  const template = variantTemplates[closestSize as keyof typeof variantTemplates] || Object.values(variantTemplates)[0];
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={template.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {template.children}
    </svg>
  );
};

Filter.displayName = "Filter";
