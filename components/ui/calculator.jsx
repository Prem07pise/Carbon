"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emissionFactors = {
    electricity: 0.92, // lbs CO2/kWh
    gasoline: 19.6, // lbs CO2/gallon
    diesel: 22.4, // lbs CO2/gallon
    naturalGas: 117, // lbs CO2/therm
    heatingOil: 22.4, // lbs CO2/gallon
    propane: 12.7, // lbs CO2/gallon
    landfill: 2072, // lbs CO2/ton
};

export default function Calculator() {
    const [category, setCategory] = useState('electricity');
    const [value, setValue] = useState('');
    const [result, setResult] = useState(null);
    const [month, setMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    const [monthlyData, setMonthlyData] = useState([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('calculator_monthly_data');
            if (raw) setMonthlyData(JSON.parse(raw));
        } catch (e) {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem('calculator_monthly_data', JSON.stringify(monthlyData)); } catch (e) {}
    }, [monthlyData]);

    const handleCalculate = () => {
        const factor = emissionFactors[category];
        const footprint = parseFloat(value) * factor;
        setResult(footprint.toFixed(2));
        if (!isNaN(footprint)) {
            // update monthly data (replace existing month entry)
            setMonthlyData(prev => {
                const copy = [...prev];
                const idx = copy.findIndex(r => r.month === month);
                const entry = { month, value: Math.round(footprint*100)/100 };
                if (idx >= 0) copy[idx] = entry; else copy.push(entry);
                // keep sorted by month
                copy.sort((a,b) => a.month.localeCompare(b.month));
                return copy;
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Carbon Footprint Calculator</CardTitle>
                <CardDescription>Calculate the carbon footprint for a specific activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="electricity">Electricity (kWh)</SelectItem>
                            <SelectItem value="gasoline">Gasoline (gallons)</SelectItem>
                            <SelectItem value="diesel">Diesel (gallons)</SelectItem>
                            <SelectItem value="naturalGas">Natural Gas (therms)</SelectItem>
                            <SelectItem value="heatingOil">Heating Oil (gallons)</SelectItem>
                            <SelectItem value="propane">Propane (gallons)</SelectItem>
                            <SelectItem value="landfill">Waste (tons)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Value</Label>
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter value"
                    />
                </div>
                <div>
                    <Label>Month</Label>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>
                <Button onClick={handleCalculate} className="w-full">
                    Calculate
                </Button>
                {result && (
                    <div className="text-center pt-4">
                        <p className="text-lg font-semibold">Estimated Carbon Footprint:</p>
                        <p className="text-3xl font-bold text-emerald-600">{result} lbs CO2e</p>
                    </div>
                )}
                {/* Monthly trends chart */}
                <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Monthly Trends</h4>
                    {monthlyData.length === 0 ? (
                        <div className="text-sm text-gray-500">No monthly data yet. Calculate and it will be charted by month.</div>
                    ) : (
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#FF8C66" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
