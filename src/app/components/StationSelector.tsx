"use client";

import React, { useState } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useStation } from '../contexts/StationContext';
import { Station } from '../types/types';

interface StationSelectorProps {
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'lg';
    disabled?: boolean;
}

const StationSelector: React.FC<StationSelectorProps> = ({
    className = '',
    showLabel = true,
    size = 'sm',
    disabled = false
}) => {
    const {
        currentStation,
        availableStations,
        isLoading,
        error,
        setCurrentStation
    } = useStation();

    const [isChanging, setIsChanging] = useState(false);

    const handleStationChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const stationId = parseInt(event.target.value);
        if (!stationId) {
            await setCurrentStation(null);
            return;
        }

        const selectedStation = availableStations.find(station => station.id === stationId);
        if (!selectedStation) {
            return;
        }

        setIsChanging(true);
        try {
            await setCurrentStation(selectedStation);
        } catch (error: any) {
            console.error("Error changing station:", error);
            // Optionally show error to user
        } finally {
            setIsChanging(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                {showLabel && <Form.Label className="me-2 mb-0">Station:</Form.Label>}
                <Spinner animation="border" size="sm" className="me-2" />
                <span className="text-muted">Loading stations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className={className}>
                <Alert.Heading className="h6">Station Error</Alert.Heading>
                <p className="mb-0">{error}</p>
            </Alert>
        );
    }

    if (availableStations.length === 0) {
        return (
            <Alert variant="warning" className={className}>
                <Alert.Heading className="h6">No Stations Available</Alert.Heading>
                <p className="mb-0">You haven't been assigned to any stations. Please contact your administrator.</p>
            </Alert>
        );
    }

    return (
        <div className={className}>
            <Form.Group>
                <Form.Select
                    value={currentStation?.id || ''}
                    onChange={handleStationChange}
                    size={size}
                    disabled={disabled || isChanging}
                    className="border-2"
                >
                    <option value="">Choose a station...</option>
                    {availableStations.map((station: Station) => (
                        <option key={station.id} value={station.id}>
                            {station.name}
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>
        </div>
    );
};

export default StationSelector;
