import { THEME_STORAGE_KEY } from "@/lib/theme/settings";

/** Runs before paint to avoid theme flash on hard refresh */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);var t=p==="light"?"light":p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
