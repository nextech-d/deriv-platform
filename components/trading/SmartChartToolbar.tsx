"use client";

import { memo, useEffect, useState } from "react";
import { loadSmartCharts } from "@/lib/chart/smartcharts-loader";

type SmartChartsWidgets = Awaited<ReturnType<typeof loadSmartCharts>>;

interface SmartChartToolbarProps {
  updateChartType: (chartType: string) => void;
  updateGranularity: (granularity: number) => void;
  position?: string | null;
  isDesktop?: boolean;
}

function SmartChartToolbarInner({
  widgets,
  updateChartType,
  updateGranularity,
  position,
  isDesktop,
}: SmartChartToolbarProps & { widgets: SmartChartsWidgets }) {
  const { ToolbarWidget, ChartMode, StudyLegend, Views, DrawTools, Share } = widgets;

  return (
    <ToolbarWidget position={position ?? undefined}>
      <ChartMode
        portalNodeId="modal_root"
        onChartType={updateChartType}
        onGranularity={updateGranularity}
      />
      {isDesktop ? (
        <>
          <StudyLegend portalNodeId="modal_root" searchInputClassName="data-hj-whitelist" />
          <Views
            portalNodeId="modal_root"
            onChartType={updateChartType}
            onGranularity={updateGranularity}
            searchInputClassName="data-hj-whitelist"
          />
          <DrawTools portalNodeId="modal_root" />
          <Share portalNodeId="modal_root" />
        </>
      ) : null}
    </ToolbarWidget>
  );
}

export const SmartChartToolbar = memo(function SmartChartToolbar(props: SmartChartToolbarProps) {
  const [widgets, setWidgets] = useState<SmartChartsWidgets | null>(null);

  useEffect(() => {
    void loadSmartCharts().then(setWidgets);
  }, []);

  if (!widgets) return null;
  return <SmartChartToolbarInner widgets={widgets} {...props} />;
});

interface SmartChartTitleProps {
  onChange: (symbol: string) => void;
}

export const SmartChartTitle = memo(function SmartChartTitle({ onChange }: SmartChartTitleProps) {
  const [widgets, setWidgets] = useState<SmartChartsWidgets | null>(null);

  useEffect(() => {
    void loadSmartCharts().then(setWidgets);
  }, []);

  if (!widgets) return null;
  const { ChartTitle } = widgets;
  return <ChartTitle onChange={onChange} />;
});
