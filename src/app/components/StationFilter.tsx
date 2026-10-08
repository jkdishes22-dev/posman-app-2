"use client";

import React from "react";
import { Station } from "../types/types";
import AppSelect from "./AppSelect";

interface StationFilterProps {
    selectedStationId: number | null;
    availableStations: Station[];
    onStationFilterChange: (stationId: number | null) => void;
    onStationSwitch?: (station: Station) => void;
    className?: string;
    showLabel?: boolean;
    showSwitchOption?: boolean;
}

const StationFilter: React.FC<StationFilterProps> = ({
    selectedStationId,
    availableStations,
    onStationFilterChange,
    onStationSwitch,
    className = "",
    showLabel = true,
    showSwitchOption = false
}) => {
    const handleChange = (stationId: string) => {
        if (stationId === "") {
            onStationFilterChange(null);
        } else {
            const stationIdNum = Number(stationId);
            onStationFilterChange(stationIdNum);

            // If switching stations (not just filtering), call the switch handler
            if (showSwitchOption && onStationSwitch) {
                const station = availableStations.find(s => s.id === stationIdNum);
                if (station) {
                    onStationSwitch(station);
                }
            }
        }
    };

    return (
        <div className={className}>
            {showLabel && (
                <label className="form-label fw-semibold">
                    <i className="bi bi-funnel me-2 text-primary"></i>
                    Filter by Station
                </label>
            )}
            <AppSelect
                options={availableStations.map((s) => ({ value: String(s.id), label: s.name }))}
                value={selectedStationId ? String(selectedStationId) : ""}
                onChange={(v) => handleChange(v)}
                placeholder="Select a station to filter"
                isClearable
            />
        </div>
    );
};

export default StationFilter;
