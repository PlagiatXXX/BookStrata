import React, { useState } from "react";

interface SocialIconsProps {
  links?: {
    instagram?: string;
    telegram?: string;
    vk?: string;
    max?: string;
    youtube?: string;
    yandexMail?: string;
    github?: string;
    phone?: string;
  };
}

const ICON_BASE =
  "rounded-lg p-3 bg-white/20 backdrop-blur-md flex justify-center items-center w-full h-full hover:text-white transition-all duration-200";

export const SocialIcons = ({
  links = {},
}: SocialIconsProps) => {
  const [open, setOpen] = useState(false);

  const {
    instagram = "#",
    telegram = "#",
    vk = "#",
    max = "#",
    youtube = "#",
    yandexMail = "#",
    github = "#",
    phone = "#",
  } = links;

  const items: Array<{ href: string; className: string; children: React.ReactNode }> = [
    {
      href: instagram,
      className: `${ICON_BASE} hover:bg-[#cc39a4] text-[#cc39a4]`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm5-3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm7.597 2.214a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2h-.01a1 1 0 0 1-1-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-5 3a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: telegram,
      className: `${ICON_BASE} hover:bg-blue-500 text-blue-500`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z"/>
        </svg>
      ),
    },
    {
      href: vk,
      className: `${ICON_BASE} hover:bg-blue-600 text-blue-600`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path
            fill="currentColor"
            d="M11.7 18h1.4s.4-.05.6-.2c.2-.15.2-.45.2-.45s-.03-1.3.6-1.5c.6-.2 1.4 1.3 2.2 1.8.6.4 1 .3 1 .3l2.2-.03s1.15-.07.6-.95c-.04-.07-.3-.65-1.6-1.85-1.3-1.2-1.1-1 .45-3.15 1-1.3 1.4-2.1 1.2-2.45-.1-.25-.8-.2-.8-.2l-2.3.02s-.17-.02-.3.07c-.13.08-.2.23-.2.23s-.3.8-.7 1.5c-.8 1.4-1.1 1.5-1.25 1.4-.3-.2-.2-.85-.2-1.3 0-1.4.2-2-.4-2.15-.2-.07-.5-.1-.8-.1-1.2 0-2.2.75-2.2.75s-.45.25-.6.35c0 0-.07.03-.1.05h-.02v.02s0-.02-.02-.02c-.07-.07-.1-.1-.1-.1s-.6-.65-1-.9C9.5 6.3 8.9 6 8.9 6s-.75-.2-.4.3c.25.4.8 1.2 1.1 1.6.4.6.5.9.5.9s.2.35.1.65c-.15.4-.8 1.7-1.1 2-.2.2-.5.2-.7.15-.5-.1-1.1-.75-1.6-1.5C6.4 9.5 6 8.8 6 8.8s-.1-.25-.25-.35c-.2-.1-.5-.1-.5-.1l-2.2.02s-.33.01-.45.15c-.1.15 0 .45 0 .45s1.3 3.1 2.9 4.7c1.4 1.4 3 1.3 3 1.3h.7z"
          />
        </svg>
      ),
    },
    {
      href: max,
      className: `${ICON_BASE} hover:bg-blue-600 text-blue-600`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 1000 1000" fill="currentColor" className="h-7 w-7">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M508.211 878.328c-75.007 0-109.864-10.95-170.453-54.75-38.325 49.275-159.686 87.783-164.979 21.9 0-49.456-10.95-91.248-23.36-136.873-14.782-56.21-31.572-118.807-31.572-209.508 0-216.626 177.754-379.597 388.357-379.597 210.785 0 375.947 171.001 375.947 381.604.707 207.346-166.595 376.118-373.94 377.224m3.103-571.585c-102.564-5.292-182.499 65.7-200.201 177.024-14.6 92.162 11.315 204.398 33.397 210.238 10.585 2.555 37.23-18.98 53.837-35.587a189.8 189.8 0 0 0 92.71 33.032c106.273 5.112 197.08-75.794 204.215-181.95 4.154-106.382-77.67-196.486-183.958-202.574Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: youtube,
      className: `${ICON_BASE} hover:bg-red-600 text-red-600`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
    },
    {
      href: yandexMail,
      className: `${ICON_BASE} hover:bg-orange-500 text-orange-500`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.5L12 14 2 7.5V6z"/>
          <path d="M2 9.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9.5l-10 6.5L2 9.5z"/>
        </svg>
      ),
    },
    {
      href: github,
      className: `${ICON_BASE} hover:bg-black text-black`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path
            fill="currentColor"
            clipRule="evenodd"
            d="M12.006 2a9.847 9.847 0 0 0-6.484 2.44 10.32 10.32 0 0 0-3.393 6.17 10.48 10.48 0 0 0 1.317 6.955 10.045 10.045 0 0 0 5.4 4.418c.504.095.683-.223.683-.494 0-.245-.01-1.052-.014-1.908-2.78.62-3.366-1.21-3.366-1.21a2.711 2.711 0 0 0-1.11-1.5c-.907-.637.07-.621.07-.621.317.044.62.163.885.346.266.183.487.426.647.71.135.253.318.476.538.655a2.079 2.079 0 0 0 2.37.196c.045-.52.27-1.006.635-1.37-2.219-.259-4.554-1.138-4.554-5.07a4.022 4.022 0 0 1 1.031-2.75 3.77 3.77 0 0 1 .096-2.713s.839-.275 2.749 1.05a9.26 9.26 0 0 1 5.004 0c1.906-1.325 2.74-1.05 2.74-1.05.37.858.406 1.828.101 2.713a4.017 4.017 0 0 1 1.029 2.75c0 3.939-2.339 4.805-4.564 5.058a2.471 2.471 0 0 1 .679 1.897c0 1.372-.012 2.477-.012 2.814 0 .272.18.592.687.492a10.05 10.05 0 0 0 5.388-4.421 10.473 10.473 0 0 0 1.313-6.948 10.32 10.32 0 0 0-3.39-6.165A9.847 9.847 0 0 0 12.007 2Z"
            fillRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: phone,
      className: `${ICON_BASE} hover:bg-green-500 text-green-500`,
      children: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      className="relative inline-block"
      onMouseLeave={() => setOpen(false)}
    >
      {/* Social icons grid — появляется при open */}
      <div
        className={`
          grid grid-cols-3 gap-2 transition-all duration-300 ease-out
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}
        `}
      >
        {/* Первый ряд: Instagram, Telegram, VK */}
        {items.slice(0, 3).map((item, i) => (
          <a
            key={i}
            href={item.href}
            {...(item.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={item.className}
          >
            {item.children}
          </a>
        ))}
        {/* Второй ряд: MAX, пусто (центр), YouTube */}
        <a
          key={3}
          href={items[3]!.href}
          {...(items[3]!.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={items[3]!.className}
        >
          {items[3]!.children}
        </a>
        <div key="spacer" />
        <a
          key={4}
          href={items[4]!.href}
          {...(items[4]!.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={items[4]!.className}
        >
          {items[4]!.children}
        </a>
        {/* Третий ряд: YandexMail, GitHub, Phone */}
        <a
          key={5}
          href={items[5]!.href}
          {...(items[5]!.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={items[5]!.className}
        >
          {items[5]!.children}
        </a>
        <a
          key={6}
          href={items[6]!.href}
          {...(items[6]!.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={items[6]!.className}
        >
          {items[6]!.children}
        </a>
        <a
          key={7}
          href={items[7]!.href}
          {...(items[7]!.href !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={items[7]!.className}
        >
          {items[7]!.children}
        </a>
      </div>

      {/* Гамбургер — триггер */}
      <span
        onMouseEnter={() => setOpen(true)}
        className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          z-10
          flex items-center justify-center
          w-14 h-14
          rounded-full
          bg-white/10 backdrop-blur-md
          hover:bg-white/20
          transition-all duration-200
          ${open ? "opacity-0 pointer-events-none" : "opacity-100"}
          shadow-sm
          cursor-pointer
        `}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="w-7 h-7 text-gray-400"
        >
          <path
            d="M5 7h14M5 12h14M5 17h14"
            strokeWidth={2}
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
      </span>
    </div>
  );
};
