'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingDown, TrendingUp, AlertCircle, Upload, Plus, Trash2, FileDown, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThreeScene from '@/components/ui/three-scene';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import Calculator from '@/components/ui/calculator';
import Chatbot from '@/components/ui/chatbot';
import { Toaster } from '@/components/ui/toaster';

const COLORS = ['#10b981', '#059669', '#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#a78bfa'];

export default function App() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [emissions, setEmissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'electricity',
    subcategory: 'grid',
    value: '',
    department: '',
    notes: ''
  });
  
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [csvFile, setCsvFile] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchDepartments();
    fetchEmissions();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      fetchAnalytics();
      fetchTrends();
      fetchRecommendations();
    }
  }, [selectedDepartment, dateRange, departments]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
        if (data.data.length > 0 && !formData.department) {
          setFormData(prev => ({ ...prev, department: data.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const res = await fetch(`/api/emissions?${params}`);
      const data = await res.json();
      if (data.success) {
        setEmissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching emissions:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const res = await fetch(`/api/analytics/summary?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      params.append('months', '12');
      
      const res = await fetch(`/api/analytics/trends?${params}`);
      const data = await res.json();
      if (data.success) {
        setTrends(data.data);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      
      const res = await fetch(`/api/recommendations?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleSubmitEmission = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/emissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `Emission recorded: ${data.data.co2Kg.toFixed(2)} kg CO2e`,
        });
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'electricity',
          subcategory: 'grid',
          value: '',
          department: formData.department,
          notes: ''
        });
        fetchEmissions();
        fetchAnalytics();
        fetchTrends();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to record emission',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit emission data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDepartment)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Department added successfully',
        });
        setNewDepartment({ name: '', description: '' });
        fetchDepartments();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add department',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    
    setLoading(true);
    
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const emissionsData = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const emission = {};
        
        headers.forEach((header, index) => {
          emission[header.toLowerCase()] = values[index];
        });
        
        if (emission.date && emission.category && emission.subcategory && emission.value && emission.department) {
          emissionsData.push(emission);
        }
      }
      
      if (emissionsData.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid data found in CSV file',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      const res = await fetch('/api/emissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emissions: emissionsData })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `Imported ${data.data.imported} emission records`,
        });
        setCsvFile(null);
        fetchEmissions();
        fetchAnalytics();
        fetchTrends();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process CSV file',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmission = async (id) => {
    try {
      const res = await fetch(`/api/emissions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Emission record deleted',
        });
        fetchEmissions();
        fetchAnalytics();
        fetchTrends();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete emission',
        variant: 'destructive'
      });
    }
  };

  const downloadReport = async (format = 'pdf') => {
    if (!analytics) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      department: selectedDepartment === 'all' ? 'All Departments' : departments.find(d => d.id === selectedDepartment)?.name,
      dateRange: dateRange.start && dateRange.end ? `${dateRange.start} to ${dateRange.end}` : 'All Time',
      summary: {
        totalEmissions: `${analytics.totalEmissions.toFixed(2)} kg CO2e`,
        totalRecords: analytics.totalRecords,
        lastMonthTotal: `${analytics.lastMonthTotal.toFixed(2)} kg CO2e`,
        monthOverMonthChange: `${analytics.monthOverMonthChange}%`
      },
      categoryBreakdown: analytics.categoryBreakdown,
      departmentBreakdown: analytics.departmentBreakdown,
      recommendations: recommendations
    };

    const dateStr = new Date().toISOString().split('T')[0];

    try {
      if (format === 'pdf') {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Carbon Footprint Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${reportData.generatedAt}`, 14, 30);
        doc.text(`Department: ${reportData.department}`, 14, 36);
        doc.text(`Date Range: ${reportData.dateRange}`, 14, 42);

        let y = 52;
        doc.setFontSize(12);
        doc.text('Summary', 14, y);
        y += 6;
        doc.setFontSize(10);
        doc.text(`Total Emissions: ${reportData.summary.totalEmissions}`, 14, y);
        y += 6;
        doc.text(`Total Records: ${reportData.summary.totalRecords}`, 14, y);
        y += 6;
        doc.text(`Last Month Total: ${reportData.summary.lastMonthTotal}`, 14, y);
        y += 8;

        doc.setFontSize(12);
        doc.text('Category Breakdown', 14, y);
        y += 6;
        doc.setFontSize(10);
        Object.entries(reportData.categoryBreakdown || {}).forEach(([k, v]) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${k}: ${Math.round(v * 100) / 100} kg`, 14, y);
          y += 6;
        });

        y += 6;
        doc.setFontSize(12);
        doc.text('Recommendations', 14, y);
        y += 6;
        doc.setFontSize(10);
        reportData.recommendations.forEach((r, idx) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${idx + 1}. ${r.title} (${r.priority})`, 14, y);
          y += 6;
          doc.text(`${r.description}`, 16, y);
          y += 8;
        });

        doc.save(`carbon-footprint-report-${dateStr}.pdf`);
      } else if (format === 'xlsx' || format === 'excel') {
        // Summary sheet
        const summaryArr = [
          { Key: 'Generated', Value: reportData.generatedAt },
          { Key: 'Department', Value: reportData.department },
          { Key: 'Date Range', Value: reportData.dateRange },
          { Key: 'Total Emissions (kg)', Value: analytics.totalEmissions },
          { Key: 'Total Records', Value: analytics.totalRecords },
          { Key: 'Last Month Total (kg)', Value: analytics.lastMonthTotal },
          { Key: 'Month-over-Month Change (%)', Value: analytics.monthOverMonthChange }
        ];

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summaryArr, { header: ['Key', 'Value'] });
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // Category breakdown sheet
        const catArr = Object.entries(reportData.categoryBreakdown || {}).map(([k, v]) => ({ Category: k, Emissions_kg: Math.round(v * 100) / 100 }));
        const wsCat = XLSX.utils.json_to_sheet(catArr);
        XLSX.utils.book_append_sheet(wb, wsCat, 'Category Breakdown');

        // Department breakdown sheet
        const deptArr = Object.entries(reportData.departmentBreakdown || {}).map(([k, v]) => ({ DepartmentId: k, Emissions_kg: Math.round(v * 100) / 100 }));
        // replace departmentId with names where possible
        const deptArrNamed = deptArr.map(d => ({ Department: (departments.find(x => x.id === d.DepartmentId)?.name) || d.DepartmentId, Emissions_kg: d.Emissions_kg }));
        const wsDept = XLSX.utils.json_to_sheet(deptArrNamed);
        XLSX.utils.book_append_sheet(wb, wsDept, 'Department Breakdown');

        // Recommendations sheet
        const recArr = reportData.recommendations.map(r => ({ Title: r.title, Priority: r.priority, Description: r.description, PotentialReduction: r.potentialReduction }));
        const wsRec = XLSX.utils.json_to_sheet(recArr);
        XLSX.utils.book_append_sheet(wb, wsRec, 'Recommendations');

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carbon-footprint-report-${dateStr}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: 'Success', description: `Report downloaded (${format.toUpperCase()})` });
    } catch (err) {
      console.error('Export error', err);
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    }
  };

  const getCategoryBreakdownChart = () => {
    if (!analytics?.categoryBreakdown) return [];
    
    return Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value * 100) / 100
    }));
  };

  const getDepartmentComparisonChart = () => {
    if (!analytics?.departmentBreakdown) return [];
    
    return Object.entries(analytics.departmentBreakdown).map(([deptId, value]) => {
      const dept = departments.find(d => d.id === deptId);
      return {
        name: dept?.name || 'Unknown',
        emissions: Math.round(value * 100) / 100
      };
    });
  };

  const subcategoryOptions = {
    electricity: ['grid', 'solar', 'wind'],
    transportation: ['gasoline', 'diesel', 'electric', 'hybrid', 'publicTransit', 'flight'],
    heating: ['naturalGas', 'heatingOil', 'propane', 'electric'],
    waste: ['landfill', 'recycled', 'composted']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <Toaster />
      
      {/* Header */}
      <header className="header-stunning bg-white border-b border-emerald-100 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-white p-1">
                <ThreeScene className="w-20 h-20 rounded" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Carbon Footprint Analytics</h1>
                <p className="text-sm text-gray-600">Track, analyze, and reduce emissions — beautiful insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => downloadReport('pdf')} disabled={!analytics} className="btn-stunning">
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={() => downloadReport('xlsx')} disabled={!analytics} className="btn-stunning">
                <FileDown className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6 border-emerald-100">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-emerald-100 card-stunning">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Emissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    {analytics ? `${analytics.totalEmissions.toFixed(0)}` : '0'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">kg CO2e</p>
                </CardContent>
              </Card>

              <Card className="border-blue-100 card-stunning">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Last Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {analytics ? `${analytics.lastMonthTotal.toFixed(0)}` : '0'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">kg CO2e</p>
                </CardContent>
              </Card>

              <Card className="border-orange-100 card-stunning">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Month-over-Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold flex items-center gap-2 ${
                    analytics?.monthOverMonthChange > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {analytics?.monthOverMonthChange > 0 ? (
                      <TrendingUp className="h-6 w-6" />
                    ) : (
                      <TrendingDown className="h-6 w-6" />
                    )}
                    {analytics ? `${Math.abs(analytics.monthOverMonthChange)}%` : '0%'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-100 card-stunning">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {analytics ? analytics.totalRecords : 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">data points</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <Card className="border-emerald-100">
                <CardHeader>
                  <CardTitle>Emissions by Category</CardTitle>
                  <CardDescription>Distribution across emission sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getCategoryBreakdownChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getCategoryBreakdownChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Department Comparison */}
              <Card className="border-blue-100">
                <CardHeader>
                  <CardTitle>Department Comparison</CardTitle>
                  <CardDescription>Emissions by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getDepartmentComparisonChart()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="emissions" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Trends Over Time */}
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle>Emissions Trends (Last 12 Months)</CardTitle>
                <CardDescription>Monthly breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="electricity" stroke="#3b82f6" name="Electricity" />
                    <Line type="monotone" dataKey="transportation" stroke="#f59e0b" name="Transportation" />
                    <Line type="monotone" dataKey="heating" stroke="#ef4444" name="Heating" />
                    <Line type="monotone" dataKey="waste" stroke="#8b5cf6" name="Waste" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Entry Tab */}
          <TabsContent value="data-entry" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual Entry */}
              <Card className="border-emerald-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Emission Data
                  </CardTitle>
                  <CardDescription>Manually enter emission data</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitEmission} className="space-y-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: subcategoryOptions[value][0] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electricity">Electricity</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="heating">Heating/Cooling</SelectItem>
                          <SelectItem value="waste">Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Subcategory</Label>
                      <Select
                        value={formData.subcategory}
                        onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategoryOptions[formData.category]?.map(sub => (
                            <SelectItem key={sub} value={sub}>
                              {sub.charAt(0).toUpperCase() + sub.slice(1).replace(/([A-Z])/g, ' $1')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="Enter consumption value"
                        required
                      />
                    </div>

                    <div>
                      <Label>Department</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any additional notes..."
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                      {loading ? 'Recording...' : 'Record Emission'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* CSV Upload */}
              <Card className="border-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk CSV Upload
                  </CardTitle>
                  <CardDescription>Upload multiple records at once</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCSVUpload} className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <Label htmlFor="csv-upload" className="cursor-.header-stunning {
    background: linear-gradient(to right, var(--primary), var(--secondary));
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.header-stunning h1 {
    font-size: 2.5rem;
    font-family: 'Georgia', serif;
}pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Click to upload CSV
                        </span>
                        <Input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </Label>
                      {csvFile && (
                        <p className="text-sm text-gray-600 mt-2">
                          Selected: {csvFile.name}
                        </p>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">CSV Format Required:</h4>
                      <code className="text-xs block bg-white p-2 rounded border">
                        date,category,subcategory,value,department,notes<br />
                        2024-01-15,electricity,grid,1500,dept-id,Office usage
                      </code>
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!csvFile || loading}>
                      {loading ? 'Uploading...' : 'Upload CSV'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Recent Records */}
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle>Recent Emission Records</CardTitle>
                <CardDescription>Last 10 entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {emissions.slice(0, 10).map(emission => {
                    const dept = departments.find(d => d.id === emission.department);
                    return (
                      <div key={emission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{emission.category}</span>
                            <span className="text-sm text-gray-500">({emission.subcategory})</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {emission.value} {emission.unit} • {dept?.name || 'Unknown'} • {emission.date}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">{emission.co2Kg.toFixed(2)} kg</div>
                            <div className="text-xs text-gray-500">CO2e</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmission(emission.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {emissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No emission records yet. Add your first entry above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-yellow-500" />
                  AI-Powered Recommendations
                </CardTitle>
                <CardDescription>Personalized strategies to reduce your carbon footprint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={rec.id} className={`p-6 rounded-lg border-2 ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-600 text-white' :
                            rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {rec.priority.toUpperCase()} PRIORITY
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{rec.category}</span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold mb-2">{rec.title}</h3>
                      <p className="text-gray-700 mb-4">{rec.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Potential Reduction:</span>
                          <div className="font-medium text-green-600">{rec.potentialReduction}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Est. Cost:</span>
                          <div className="font-medium">{rec.estimatedCost}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Payback Period:</span>
                          <div className="font-medium">{rec.paybackPeriod}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {recommendations.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Add emission data to receive personalized recommendations</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            <Calculator />
          </TabsContent>

          {/* Chatbot Tab */}
          <TabsContent value="chatbot">
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle>Chatbot</CardTitle>
                <CardDescription>Ask questions and get recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <Chatbot />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle>Manage Departments</CardTitle>
                <CardDescription>Add and manage organizational departments</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddDepartment} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Department Name</Label>
                      <Input
                        value={newDepartment.name}
                        onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                        placeholder="e.g., Operations"
                        required
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newDepartment.description}
                        onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </form>

                <div className="space-y-2">
                  <h4 className="font-medium mb-3">Existing Departments ({departments.length})</h4>
                  {departments.map(dept => (
                    <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <div className="font-medium">{dept.name}</div>
                        {dept.description && (
                          <div className="text-sm text-gray-500">{dept.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {departments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No departments yet. Add your first department above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100">
              <CardHeader>
                <CardTitle>Emission Factors Reference</CardTitle>
                <CardDescription>EPA emission factors used in calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Electricity</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Grid Electricity: 0.92 lbs CO2/kWh</li>
                      <li>Solar/Wind: 0 lbs CO2/kWh</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Transportation</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Gasoline: 19.6 lbs CO2/gallon</li>
                      <li>Diesel: 22.4 lbs CO2/gallon</li>
                      <li>Electric Vehicle: 0.36 lbs CO2/mile</li>
                      <li>Air Travel: 0.4 lbs CO2/mile</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Heating/Cooling</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Natural Gas: 117 lbs CO2/therm</li>
                      <li>Heating Oil: 22.4 lbs CO2/gallon</li>
                      <li>Propane: 12.7 lbs CO2/gallon</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Waste</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Landfill: 2,072 lbs CO2/ton</li>
                      <li>Recycled/Composted: 0 lbs CO2/ton</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}