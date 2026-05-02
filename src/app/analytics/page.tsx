"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { DashboardLoadingScreen } from "@/components/DashboardLoadingScreen";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { ProviderScoreBreakdownTable } from "@/components/ProviderScoreBreakdownTable";
import { TariffTable } from "@/components/TariffTable";
import { TariffRecommendationPanel } from "@/components/TariffRecommendationPanel";
import { TouHeatmap } from "@/components/TouHeatmap";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { calculateAverageRate, filterConsumption, filterConsumptionByRange, scoreTariffs, useDashboardStore } from "@/lib/utils";

export default function AnalyticsPage() {
  const {
    loading,
    initialized,
    tariffs,
    touPeriods,
    consumption,
    selectedProvider,
    selectedDevice,
    selectedRange,
    compactTableDensity,
    loadData
  } = useDashboardStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading || !initialized) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(timer);
  }, [loading, initialized]);

  const blendedRate = useMemo(() => calculateAverageRate(tariffs), [tariffs]);
  const providers = useMemo(() => tariffs.map((item) => item.providerName), [tariffs]);
  const devices = useMemo(() => Array.from(new Set(consumption.map((row) => row.deviceId))), [consumption]);
  const filteredTariffs = useMemo(
    () => (selectedProvider === "all" ? tariffs : tariffs.filter((item) => item.providerName === selectedProvider)),
    [selectedProvider, tariffs]
  );
  const rangeFilteredConsumption = useMemo(
    () => filterConsumptionByRange(consumption, selectedRange),
    [consumption, selectedRange]
  );
  const filteredConsumptionRows = useMemo(
    () => filterConsumption(rangeFilteredConsumption, selectedDevice),
    [rangeFilteredConsumption, selectedDevice]
  );
  const filteredTouPeriods = useMemo(
    () => touPeriods.filter((period) => filteredTariffs.some((tariff) => tariff.id === period.tariffId)),
    [filteredTariffs, touPeriods]
  );
  const scoredTariffs = useMemo(
    () => scoreTariffs(filteredTariffs, filteredTouPeriods, filteredConsumptionRows),
    [filteredTariffs, filteredTouPeriods, filteredConsumptionRows]
  );

  if (loading || !initialized) {
    return (
      <DashboardLoadingScreen
        title="Loading Analytics Matrix"
        description="Preparing range-aware trends, provider filters, and TOU intelligence."
      />
    );
  }

  return (
    <section className={["space-y-6 transition-all duration-500", ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"].join(" ")}>
      <GlobalFilterBar providers={providers} devices={devices} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TariffRecommendationPanel scoredTariffs={scoredTariffs} />
        <WhatIfSimulator consumption={filteredConsumptionRows} blendedRate={blendedRate} />
      </div>
      <AnalyticsChart consumption={filteredConsumptionRows} blendedRate={blendedRate} selectedRange={selectedRange} />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TariffTable tariffs={filteredTariffs} touPeriods={filteredTouPeriods} compact={compactTableDensity} />
        </div>
        <div className="xl:col-span-2">
          <TouHeatmap periods={filteredTouPeriods} />
        </div>
      </div>
      <ProviderScoreBreakdownTable scoredTariffs={scoredTariffs} />
    </section>
  );
}
