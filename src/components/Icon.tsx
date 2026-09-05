import { type ComponentPropsWithoutRef } from "react";

/**
 * Material Symbols icon component.
 *
 * Instead of relying on font ligatures (which require the full 4MB font),
 * we map icon names to their Unicode code points in the Private Use Area.
 * This allows the font to be subset to only the needed glyphs (~50KB).
 *
 * Usage:
 *   <Icon name="star" />
 *   <Icon name="arrow_back" className="text-lg" />
 */

const ICON_MAP: Record<string, string> = {
  account_circle: "\uE853",
  add: "\uE145",
  album: "\uE019",
  analytics: "\uEF3E",
  arrow_back: "\uE5C4",
  artist: "\uE01A",
  aspect_ratio: "\uE85B",
  auto_stories: "\uE666",
  battery_charging_full: "\uE1A3",
  battery_full: "\uE1A4",
  bluetooth: "\uE1A7",
  bolt: "\uEA0B",
  book: "\uE865",
  bookmark: "\uE866",
  bookmarks: "\uE98B",
  brush: "\uE3AE",
  build: "\uE869",
  calendar_today: "\uE935",
  cancel: "\uE5C9",
  category: "\uE574",
  chat_bubble: "\uE0CA",
  check_circle: "\uE86C",
  close: "\uE14C",
  cloud_upload: "\uE2C3",
  code: "\uE86F",
  collections_bookmark: "\uE431",
  comment: "\uE0B9",
  crop: "\uE3BE",
  crop_free: "\uE3C2",
  crop_landscape: "\uE3C3",
  crop_portrait: "\uE3C5",
  crop_square: "\uE3C1",
  delete: "\uE872",
  download: "\uE171",
  eco: "\uEA35",
  edit: "\uE150",
  emoji_objects: "\uEA24",
  error: "\uE000",
  expand_less: "\uE5CE",
  expand_more: "\uE5CF",
  fact_check: "\uF0C5",
  fast_forward: "\uE01F",
  fast_rewind: "\uE020",
  favorite: "\uE87D",
  favorite_border: "\uE87E",
  filter_list: "\uE152",
  flash_on: "\uE1E5",
  flag: "\uE881",
  format_list_bulleted: "\uE192",
  format_list_numbered: "\uE242",
  format_paint: "\uE3C9",
  format_quote: "\uE24A",
  forum: "\uE0BF",
  groups: "\uEA83",
  health_and_safety: "\uE5FD",
  history_edu: "\uEA3E",
  image: "\uE3F4",
  info: "\uE88E",
  insights: "\uEB39",
  language: "\uE894",
  library_books: "\uE02F",
  library_music: "\uE030",
  lightbulb: "\uEA80",
  link: "\uE157",
  list_alt: "\uE0EE",
  live_tv: "\uE639",
  lock: "\uE897",
  login: "\uEA77",
  logout: "\uEA78",
  local_cafe: "\uEB05",
  location_on: "\uE0C8",
  local_fire_department: "\uEA58",
  landscape: "\uE556",
  local_library: "\uE2C0",
  local_library_add: "\uE2CF",
  local_movies: "\uE02D",
  local_printshop: "\uE8AD",
  local_shipping: "\uE558",
  menu: "\uE14C",
  menu_book: "\uEA19",
  menu_open: "\uE9BD",
  more_horiz: "\uE153",
  more_vert: "\uE154",
  movie: "\uE02C",
  movie_creation: "\uE466",
  movie_filter: "\uE467",
  new_releases: "\uE031",
  newspaper: "\uE0B1",
  notifications: "\uE7F4",
  notifications_off: "\uE7F5",
  palette: "\uE40A",
  pause: "\uE034",
  pause_circle: "\uE99A",
  person: "\uE7FD",
  person_add: "\uE7FE",
  person_remove: "\uE931",
  photo_library: "\uE407",
  progress_activity: "\uE9D0",
  psychology: "\uEA4A",
  public: "\uE80B",
  queue_music: "\uE03C",
  rocket_launch: "\uEB9B",
  sort: "\uE164",
  star: "\uE838",
  star_border: "\uE83A",
  star_half: "\uE839",
  stop: "\uE047",
  stop_circle: "\uE99B",
  tag: "\uE89C",
  theater_comedy: "\uE6CA",
  trending_down: "\uE8E5",
  trending_up: "\uE8E4",
  translate: "\uE8E2",
  visibility: "\uE8F4",
  visibility_off: "\uE8F5",
  warning: "\uE002",
  workspace_premium: "\uE7AF",
};

export interface IconProps extends ComponentPropsWithoutRef<"span"> {
  /** Material Symbol icon name (e.g. "star", "arrow_back") */
  name: string;
}

export function Icon({ name, className, ...props }: IconProps) {
  const code = ICON_MAP[name];
  if (import.meta.env.DEV && !code) {
    console.warn(`[Icon] Unknown icon: "${name}". Add it to ICON_MAP.`);
  }
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      aria-hidden="true"
      {...props}
    >
      {code ?? name}
    </span>
  );
}
