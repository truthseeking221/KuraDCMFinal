import type { IconProps } from "./types";

const templates = {
  "bulk": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M1.33337 7.33352C1.33337 4.01979 4.01967 1.3335 7.33337 1.3335C10.6471 1.3335 13.3334 4.01979 13.3334 7.33352C13.3334 10.6472 10.6471 13.3335 7.33337 13.3335C4.01967 13.3335 1.33337 10.6472 1.33337 7.33352ZM7.33337 2.66683C4.75605 2.66683 2.66671 4.75617 2.66671 7.33352C2.66671 9.91086 4.75605 12.0002 7.33337 12.0002C9.91071 12.0002 12 9.91086 12 7.33352C12 4.75617 9.91071 2.66683 7.33337 2.66683Z" fill="currentColor"/>
          <path d="M12.0213 11.0782C11.7429 11.4263 11.4265 11.7426 11.0785 12.0211L13.5286 14.4712C13.789 14.7316 14.2111 14.7316 14.4714 14.4712C14.7318 14.2108 14.7318 13.7888 14.4714 13.5284L12.0213 11.0782Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M1.66663 9.1669C1.66663 5.02474 5.02449 1.66687 9.16663 1.66687C13.3088 1.66687 16.6666 5.02474 16.6666 9.1669C16.6666 13.309 13.3088 16.6669 9.16663 16.6669C5.02449 16.6669 1.66663 13.309 1.66663 9.1669ZM9.16663 3.33354C5.94497 3.33354 3.33329 5.94521 3.33329 9.1669C3.33329 12.3886 5.94497 15.0002 9.16663 15.0002C12.3883 15.0002 15 12.3886 15 9.1669C15 5.94521 12.3883 3.33354 9.16663 3.33354Z" fill="currentColor"/>
          <path d="M15.0266 13.8478C14.6786 14.2829 14.2831 14.6783 13.8481 15.0264L16.9108 18.089C17.2362 18.4144 17.7639 18.4144 18.0893 18.089C18.4147 17.7635 18.4147 17.2359 18.0893 16.9104L15.0266 13.8478Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M2 11.0003C2 6.02968 6.02944 2.00024 11 2.00024C15.9706 2.00024 20 6.02968 20 11.0003C20 15.9708 15.9706 20.0003 11 20.0003C6.02944 20.0003 2 15.9708 2 11.0003ZM11 4.00024C7.13401 4.00024 4 7.13425 4 11.0003C4 14.8663 7.13401 18.0003 11 18.0003C14.866 18.0003 18 14.8663 18 11.0003C18 7.13425 14.866 4.00024 11 4.00024Z" fill="currentColor"/>
          <path d="M18.0319 16.6174C17.6143 17.1395 17.1397 17.614 16.6177 18.0317L20.2929 21.7069C20.6834 22.0974 21.3166 22.0974 21.7071 21.7069C22.0976 21.3163 22.0976 20.6832 21.7071 20.2926L18.0319 16.6174Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M2.33337 12.8337C2.33337 7.03463 7.03439 2.33362 12.8334 2.33362C18.6324 2.33362 23.3334 7.03463 23.3334 12.8337C23.3334 18.6326 18.6324 23.3337 12.8334 23.3337C7.03439 23.3337 2.33337 18.6326 2.33337 12.8337ZM12.8334 4.66695C8.32305 4.66695 4.66671 8.3233 4.66671 12.8337C4.66671 17.344 8.32305 21.0003 12.8334 21.0003C17.3437 21.0003 21 17.344 21 12.8337C21 8.3233 17.3437 4.66695 12.8334 4.66695Z" fill="currentColor"/>
          <path d="M21.0372 19.387C20.55 19.9961 19.9963 20.5497 19.3873 21.037L23.6751 25.3247C24.1306 25.7803 24.8694 25.7803 25.325 25.3247C25.7805 24.869 25.7805 24.1304 25.325 23.6747L21.0372 19.387Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M2.66663 14.667C2.66663 8.03958 8.03921 2.66699 14.6666 2.66699C21.2941 2.66699 26.6666 8.03958 26.6666 14.667C26.6666 21.2944 21.2941 26.667 14.6666 26.667C8.03921 26.667 2.66663 21.2944 2.66663 14.667ZM14.6666 5.33366C9.51197 5.33366 5.33329 9.51234 5.33329 14.667C5.33329 19.8217 9.51197 24.0004 14.6666 24.0004C19.8213 24.0004 24 19.8217 24 14.667C24 9.51234 19.8213 5.33366 14.6666 5.33366Z" fill="currentColor"/>
          <path d="M24.0426 22.1565C23.4858 22.8526 22.853 23.4853 22.157 24.0422L27.0572 28.9425C27.5779 29.4632 28.4222 29.4632 28.9428 28.9425C29.4635 28.4217 29.4635 27.5776 28.9428 27.0568L24.0426 22.1565Z" fill="currentColor"/>
        </>
      )
    },
  },
  "duotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333Z" fill="currentColor"/>
          <path d="M11.3334 11.3334L14 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667Z" fill="currentColor"/>
          <path d="M14.1666 14.1666L17.5 17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" fill="currentColor"/>
          <path d="M17 17L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M22.1667 12.8333C22.1667 7.67867 17.988 3.5 12.8333 3.5C7.67867 3.5 3.5 7.67867 3.5 12.8333C3.5 17.988 7.67867 22.1667 12.8333 22.1667C17.988 22.1667 22.1667 17.988 22.1667 12.8333Z" fill="currentColor"/>
          <path d="M19.8334 19.8334L24.5 24.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.1667 12.8333C22.1667 7.67867 17.988 3.5 12.8333 3.5C7.67867 3.5 3.5 7.67867 3.5 12.8333C3.5 17.988 7.67867 22.1667 12.8333 22.1667C17.988 22.1667 22.1667 17.988 22.1667 12.8333Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M25.3333 14.6667C25.3333 8.77563 20.5577 4 14.6667 4C8.77563 4 4 8.77563 4 14.6667C4 20.5577 8.77563 25.3333 14.6667 25.3333C20.5577 25.3333 25.3333 20.5577 25.3333 14.6667Z" fill="currentColor"/>
          <path d="M22.6666 22.6666L28 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25.3333 14.6667C25.3333 8.77563 20.5577 4 14.6667 4C8.77563 4 4 8.77563 4 14.6667C4 20.5577 8.77563 25.3333 14.6667 25.3333C20.5577 25.3333 25.3333 20.5577 25.3333 14.6667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "solid": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M7.33337 1.33337C4.01967 1.33337 1.33337 4.01967 1.33337 7.33337C1.33337 10.6471 4.01967 13.3334 7.33337 13.3334C8.75004 13.3334 10.052 12.8424 11.0785 12.0213L13.5286 14.4714C13.789 14.7318 14.2111 14.7318 14.4714 14.4714C14.7318 14.2111 14.7318 13.789 14.4714 13.5286L12.0213 11.0785C12.8424 10.052 13.3334 8.75004 13.3334 7.33337C13.3334 4.01967 10.6471 1.33337 7.33337 1.33337ZM2.66671 7.33337C2.66671 4.75605 4.75605 2.66671 7.33337 2.66671C9.91071 2.66671 12 4.75605 12 7.33337C12 9.91071 9.91071 12 7.33337 12C4.75605 12 2.66671 9.91071 2.66671 7.33337Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M9.16663 1.66663C5.02449 1.66663 1.66663 5.02449 1.66663 9.16663C1.66663 13.3088 5.02449 16.6666 9.16663 16.6666C10.9375 16.6666 12.565 16.0529 13.848 15.0265L16.9107 18.0892C17.2361 18.4146 17.7638 18.4146 18.0892 18.0892C18.4146 17.7638 18.4146 17.2361 18.0892 16.9107L15.0265 13.848C16.0529 12.565 16.6666 10.9375 16.6666 9.16663C16.6666 5.02449 13.3088 1.66663 9.16663 1.66663ZM3.33329 9.16663C3.33329 5.94497 5.94497 3.33329 9.16663 3.33329C12.3883 3.33329 15 5.94497 15 9.16663C15 12.3883 12.3883 15 9.16663 15C5.94497 15 3.33329 12.3883 3.33329 9.16663Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M12.8334 2.33337C7.03439 2.33337 2.33337 7.03439 2.33337 12.8334C2.33337 18.6324 7.03439 23.3334 12.8334 23.3334C15.3125 23.3334 17.591 22.4741 19.3874 21.0373L23.6751 25.325C24.1307 25.7806 24.8694 25.7806 25.325 25.325C25.7806 24.8694 25.7806 24.1307 25.325 23.6751L21.0373 19.3874C22.4741 17.591 23.3334 15.3125 23.3334 12.8334C23.3334 7.03439 18.6324 2.33337 12.8334 2.33337ZM4.66671 12.8334C4.66671 8.32305 8.32305 4.66671 12.8334 4.66671C17.3437 4.66671 21 8.32305 21 12.8334C21 17.3437 17.3437 21 12.8334 21C8.32305 21 4.66671 17.3437 4.66671 12.8334Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M14.6666 2.66663C8.03921 2.66663 2.66663 8.03921 2.66663 14.6666C2.66663 21.2941 8.03921 26.6666 14.6666 26.6666C17.5 26.6666 20.104 25.6846 22.1569 24.0425L27.0572 28.9428C27.5778 29.4634 28.4221 29.4634 28.9428 28.9428C29.4634 28.4221 29.4634 27.5778 28.9428 27.0572L24.0425 22.1569C25.6846 20.104 26.6666 17.5 26.6666 14.6666C26.6666 8.03921 21.2941 2.66663 14.6666 2.66663ZM5.33329 14.6666C5.33329 9.51197 9.51197 5.33329 14.6666 5.33329C19.8213 5.33329 24 9.51197 24 14.6666C24 19.8213 19.8213 24 14.6666 24C9.51197 24 5.33329 19.8213 5.33329 14.6666Z" fill="currentColor"/>
        </>
      )
    },
  },
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M11.3334 11.3334L14 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M14.1666 14.1666L17.5 17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M17 17L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M19.8334 19.8334L24.5 24.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.1667 12.8333C22.1667 7.67867 17.988 3.5 12.8333 3.5C7.67867 3.5 3.5 7.67867 3.5 12.8333C3.5 17.988 7.67867 22.1667 12.8333 22.1667C17.988 22.1667 22.1667 17.988 22.1667 12.8333Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M22.6666 22.6666L28 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25.3333 14.6667C25.3333 8.77563 20.5577 4 14.6667 4C8.77563 4 4 8.77563 4 14.6667C4 20.5577 8.77563 25.3333 14.6667 25.3333C20.5577 25.3333 25.3333 20.5577 25.3333 14.6667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M11.3334 11.3334L14 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M14.1666 14.1666L17.5 17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M17 17L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M19.8334 19.8334L24.5 24.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.1667 12.8333C22.1667 7.67867 17.988 3.5 12.8333 3.5C7.67867 3.5 3.5 7.67867 3.5 12.8333C3.5 17.988 7.67867 22.1667 12.8333 22.1667C17.988 22.1667 22.1667 17.988 22.1667 12.8333Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M22.6666 22.6666L28 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25.3333 14.6667C25.3333 8.77563 20.5577 4 14.6667 4C8.77563 4 4 8.77563 4 14.6667C4 20.5577 8.77563 25.3333 14.6667 25.3333C20.5577 25.3333 25.3333 20.5577 25.3333 14.6667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Search = ({ size = 24, variant, ...props }: IconProps) => {
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

Search.displayName = "Search";
