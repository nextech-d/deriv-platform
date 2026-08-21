let smartChartsModule: Promise<typeof import("@deriv-com/smartcharts-champion")> | null = null;
let publicPathReady = false;

export function loadSmartCharts() {
  if (!smartChartsModule) {
    smartChartsModule = import("@deriv-com/smartcharts-champion").then((module) => {
      if (typeof window !== "undefined" && !publicPathReady) {
        module.setSmartChartsPublicPath("/smartcharts/");
        publicPathReady = true;
      }
      return module;
    });
  }
  return smartChartsModule;
}
