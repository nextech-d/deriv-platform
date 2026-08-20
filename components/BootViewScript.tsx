import { LAST_WORKSPACE_KEY } from "@/lib/terminal/last-workspace";

/**
 * Runs before paint so a refresh on Bulk Trader / Charts / etc. does not
 * flash the dashboard HTML that the server rendered.
 */
export function BootViewScript() {
  const script = `(function(){try{var path=location.pathname.replace(/\\/+$/,"")||"/";if(path!=="/"&&path!=="/dashboard")return;var h=(location.hash||"").replace(/^#/,"").trim();var ls="";try{ls=localStorage.getItem(${JSON.stringify(LAST_WORKSPACE_KEY)})||""}catch(e){}var hashDesk=h&&h!=="overview"&&h!=="dashboard"&&h!=="home";var storedDesk=ls&&ls!=="dashboard"&&ls!=="home";if(hashDesk||(path==="/dashboard"&&storedDesk&&!h)){document.documentElement.setAttribute("data-boot-hold","1");setTimeout(function(){document.documentElement.removeAttribute("data-boot-hold")},1500)}}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
