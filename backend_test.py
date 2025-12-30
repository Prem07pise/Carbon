#!/usr/bin/env python3
"""
Carbon Footprint Analytics Dashboard Backend API Tests
Tests all backend APIs for the Carbon Footprint Analytics Dashboard
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://green-analytics-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.department_ids = []
        self.emission_ids = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_get_departments(self):
        """Test GET /api/departments"""
        try:
            response = requests.get(f"{BASE_URL}/departments", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    departments = data["data"]
                    if len(departments) >= 4:
                        # Store department IDs for later tests
                        self.department_ids = [dept["id"] for dept in departments]
                        self.log_test("GET /api/departments", True, 
                                    f"Retrieved {len(departments)} departments successfully")
                        return True
                    else:
                        self.log_test("GET /api/departments", False, 
                                    f"Expected at least 4 departments, got {len(departments)}")
                else:
                    self.log_test("GET /api/departments", False, 
                                "Invalid response format", data)
            else:
                self.log_test("GET /api/departments", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/departments", False, f"Request failed: {str(e)}")
        return False
    
    def test_post_departments(self):
        """Test POST /api/departments"""
        try:
            new_dept = {
                "name": "Marketing",
                "description": "Marketing department for testing"
            }
            
            response = requests.post(f"{BASE_URL}/departments", 
                                   json=new_dept, headers=HEADERS, timeout=10)
            
            if response.status_code == 201:
                data = response.json()
                if data.get("success") and "data" in data:
                    created_dept = data["data"]
                    if created_dept.get("id") and created_dept.get("name") == "Marketing":
                        self.department_ids.append(created_dept["id"])
                        self.log_test("POST /api/departments", True, 
                                    "Department created successfully", 
                                    f"ID: {created_dept['id']}")
                        return True
                    else:
                        self.log_test("POST /api/departments", False, 
                                    "Created department missing required fields", created_dept)
                else:
                    self.log_test("POST /api/departments", False, 
                                "Invalid response format", data)
            else:
                self.log_test("POST /api/departments", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /api/departments", False, f"Request failed: {str(e)}")
        return False
    
    def test_get_emissions(self):
        """Test GET /api/emissions"""
        try:
            response = requests.get(f"{BASE_URL}/emissions", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    emissions = data["data"]
                    if len(emissions) > 0:
                        # Store some emission IDs for later tests
                        self.emission_ids = [e["id"] for e in emissions[:5]]
                        self.log_test("GET /api/emissions", True, 
                                    f"Retrieved {len(emissions)} emission records")
                        return True
                    else:
                        self.log_test("GET /api/emissions", False, "No emission records found")
                else:
                    self.log_test("GET /api/emissions", False, 
                                "Invalid response format", data)
            else:
                self.log_test("GET /api/emissions", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/emissions", False, f"Request failed: {str(e)}")
        return False
    
    def test_get_emissions_with_filters(self):
        """Test GET /api/emissions with filters"""
        if not self.department_ids:
            self.log_test("GET /api/emissions (filters)", False, "No department IDs available")
            return False
        
        try:
            # Test department filter
            dept_id = self.department_ids[0]
            response = requests.get(f"{BASE_URL}/emissions?department={dept_id}", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("GET /api/emissions (department filter)", True, 
                                f"Department filter working")
                else:
                    self.log_test("GET /api/emissions (department filter)", False, 
                                "Invalid response format", data)
            
            # Test category filter
            response = requests.get(f"{BASE_URL}/emissions?category=electricity", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("GET /api/emissions (category filter)", True, 
                                "Category filter working")
                    return True
                else:
                    self.log_test("GET /api/emissions (category filter)", False, 
                                "Invalid response format", data)
            
        except Exception as e:
            self.log_test("GET /api/emissions (filters)", False, f"Request failed: {str(e)}")
        return False
    
    def test_post_emissions(self):
        """Test POST /api/emissions"""
        if not self.department_ids:
            self.log_test("POST /api/emissions", False, "No department IDs available")
            return False
        
        try:
            new_emission = {
                "date": "2024-06-15",
                "category": "electricity",
                "subcategory": "grid",
                "value": 1500,
                "department": self.department_ids[0],
                "notes": "Office electricity usage for testing"
            }
            
            response = requests.post(f"{BASE_URL}/emissions", 
                                   json=new_emission, headers=HEADERS, timeout=10)
            
            if response.status_code == 201:
                data = response.json()
                if data.get("success") and "data" in data:
                    created_emission = data["data"]
                    
                    # Verify CO2 calculations
                    expected_co2_lbs = 1500 * 0.92  # 1380 lbs
                    expected_co2_kg = expected_co2_lbs * 0.453592  # ~625.96 kg
                    
                    actual_co2_lbs = created_emission.get("co2Lbs")
                    actual_co2_kg = created_emission.get("co2Kg")
                    
                    if (abs(actual_co2_lbs - expected_co2_lbs) < 0.1 and 
                        abs(actual_co2_kg - expected_co2_kg) < 0.1):
                        self.emission_ids.append(created_emission["id"])
                        self.log_test("POST /api/emissions", True, 
                                    "Emission created with correct CO2 calculations",
                                    f"CO2: {actual_co2_kg:.2f} kg, {actual_co2_lbs:.2f} lbs")
                        return True
                    else:
                        self.log_test("POST /api/emissions", False, 
                                    f"CO2 calculation error. Expected: {expected_co2_kg:.2f} kg, Got: {actual_co2_kg:.2f} kg")
                else:
                    self.log_test("POST /api/emissions", False, 
                                "Invalid response format", data)
            else:
                self.log_test("POST /api/emissions", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /api/emissions", False, f"Request failed: {str(e)}")
        return False
    
    def test_post_emissions_bulk(self):
        """Test POST /api/emissions/bulk"""
        if not self.department_ids:
            self.log_test("POST /api/emissions/bulk", False, "No department IDs available")
            return False
        
        try:
            bulk_emissions = {
                "emissions": [
                    {
                        "date": "2024-07-01",
                        "category": "transportation",
                        "subcategory": "gasoline",
                        "value": 10,
                        "department": self.department_ids[0],
                        "notes": "Fleet fuel consumption"
                    },
                    {
                        "date": "2024-07-02",
                        "category": "heating",
                        "subcategory": "naturalGas",
                        "value": 50,
                        "department": self.department_ids[1] if len(self.department_ids) > 1 else self.department_ids[0],
                        "notes": "Office heating"
                    }
                ]
            }
            
            response = requests.post(f"{BASE_URL}/emissions/bulk", 
                                   json=bulk_emissions, headers=HEADERS, timeout=10)
            
            if response.status_code == 201:
                data = response.json()
                if data.get("success") and data.get("data", {}).get("imported") == 2:
                    self.log_test("POST /api/emissions/bulk", True, 
                                "Bulk emissions created successfully", 
                                f"Imported {data['data']['imported']} records")
                    return True
                else:
                    self.log_test("POST /api/emissions/bulk", False, 
                                "Invalid response or import count", data)
            else:
                self.log_test("POST /api/emissions/bulk", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /api/emissions/bulk", False, f"Request failed: {str(e)}")
        return False
    
    def test_get_analytics_summary(self):
        """Test GET /api/analytics/summary"""
        try:
            response = requests.get(f"{BASE_URL}/analytics/summary", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    summary = data["data"]
                    required_fields = ["totalEmissions", "totalRecords", "categoryBreakdown", 
                                     "departmentBreakdown", "monthlyData", "lastMonthTotal", 
                                     "monthOverMonthChange"]
                    
                    missing_fields = [field for field in required_fields if field not in summary]
                    
                    if not missing_fields:
                        self.log_test("GET /api/analytics/summary", True, 
                                    "Summary analytics retrieved successfully",
                                    f"Total emissions: {summary['totalEmissions']} kg CO2")
                        return True
                    else:
                        self.log_test("GET /api/analytics/summary", False, 
                                    f"Missing required fields: {missing_fields}")
                else:
                    self.log_test("GET /api/analytics/summary", False, 
                                "Invalid response format", data)
            else:
                self.log_test("GET /api/analytics/summary", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/analytics/summary", False, f"Request failed: {str(e)}")
        return False
    
    def test_get_analytics_trends(self):
        """Test GET /api/analytics/trends"""
        try:
            response = requests.get(f"{BASE_URL}/analytics/trends?months=6", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    trends = data["data"]
                    if isinstance(trends, list) and len(trends) > 0:
                        # Check if trend data has required fields
                        sample_trend = trends[0]
                        required_fields = ["month", "electricity", "transportation", "heating", "waste", "total"]
                        missing_fields = [field for field in required_fields if field not in sample_trend]
                        
                        if not missing_fields:
                            self.log_test("GET /api/analytics/trends", True, 
                                        f"Trend data retrieved successfully ({len(trends)} months)")
                            return True
                        else:
                            self.log_test("GET /api/analytics/trends", False, 
                                        f"Missing required fields in trend data: {missing_fields}")
                    else:
                        self.log_test("GET /api/analytics/trends", False, 
                                    "No trend data returned")
                else:
                    self.log_test("GET /api/analytics/trends", False, 
                                "Invalid response format", data)
            else:
                self.log_test("GET /api/analytics/trends", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/analytics/trends", False, f"Request failed: {str(e)}")
        return False
    
    def test_get_recommendations(self):
        """Test GET /api/recommendations"""
        try:
            response = requests.get(f"{BASE_URL}/recommendations", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    recommendations = data["data"]
                    if isinstance(recommendations, list) and len(recommendations) > 0:
                        # Check if recommendations have required fields
                        sample_rec = recommendations[0]
                        required_fields = ["id", "category", "priority", "title", "description", 
                                         "potentialReduction", "estimatedCost", "paybackPeriod"]
                        missing_fields = [field for field in required_fields if field not in sample_rec]
                        
                        if not missing_fields:
                            self.log_test("GET /api/recommendations", True, 
                                        f"Recommendations retrieved successfully ({len(recommendations)} items)")
                            return True
                        else:
                            self.log_test("GET /api/recommendations", False, 
                                        f"Missing required fields in recommendations: {missing_fields}")
                    else:
                        self.log_test("GET /api/recommendations", False, 
                                    "No recommendations returned")
                else:
                    self.log_test("GET /api/recommendations", False, 
                                "Invalid response format", data)
            else:
                self.log_test("GET /api/recommendations", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /api/recommendations", False, f"Request failed: {str(e)}")
        return False
    
    def test_put_emissions(self):
        """Test PUT /api/emissions/{id}"""
        if not self.emission_ids:
            self.log_test("PUT /api/emissions/{id}", False, "No emission IDs available")
            return False
        
        try:
            emission_id = self.emission_ids[0]
            update_data = {
                "value": 2000,
                "category": "electricity",
                "subcategory": "grid",
                "notes": "Updated electricity usage"
            }
            
            response = requests.put(f"{BASE_URL}/emissions/{emission_id}", 
                                  json=update_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    updated_emission = data["data"]
                    
                    # Verify CO2 recalculation
                    expected_co2_lbs = 2000 * 0.92  # 1840 lbs
                    actual_co2_lbs = updated_emission.get("co2Lbs")
                    
                    if abs(actual_co2_lbs - expected_co2_lbs) < 0.1:
                        self.log_test("PUT /api/emissions/{id}", True, 
                                    "Emission updated with correct CO2 recalculation",
                                    f"New CO2: {actual_co2_lbs} lbs")
                        return True
                    else:
                        self.log_test("PUT /api/emissions/{id}", False, 
                                    f"CO2 recalculation error. Expected: {expected_co2_lbs}, Got: {actual_co2_lbs}")
                else:
                    self.log_test("PUT /api/emissions/{id}", False, 
                                "Invalid response format", data)
            else:
                self.log_test("PUT /api/emissions/{id}", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("PUT /api/emissions/{id}", False, f"Request failed: {str(e)}")
        return False
    
    def test_delete_emissions(self):
        """Test DELETE /api/emissions/{id}"""
        if not self.emission_ids or len(self.emission_ids) < 2:
            self.log_test("DELETE /api/emissions/{id}", False, "Not enough emission IDs available")
            return False
        
        try:
            emission_id = self.emission_ids[-1]  # Use last ID
            
            response = requests.delete(f"{BASE_URL}/emissions/{emission_id}", 
                                     headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("DELETE /api/emissions/{id}", True, 
                                "Emission deleted successfully")
                    
                    # Test 404 for non-existent ID
                    fake_id = str(uuid.uuid4())
                    response = requests.delete(f"{BASE_URL}/emissions/{fake_id}", 
                                             headers=HEADERS, timeout=10)
                    
                    if response.status_code == 404:
                        self.log_test("DELETE /api/emissions/{id} (404 test)", True, 
                                    "Correctly returns 404 for non-existent ID")
                        return True
                    else:
                        self.log_test("DELETE /api/emissions/{id} (404 test)", False, 
                                    f"Expected 404, got {response.status_code}")
                else:
                    self.log_test("DELETE /api/emissions/{id}", False, 
                                "Invalid response format", data)
            else:
                self.log_test("DELETE /api/emissions/{id}", False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("DELETE /api/emissions/{id}", False, f"Request failed: {str(e)}")
        return False
    
    def test_emission_calculations(self):
        """Test emission calculation accuracy"""
        try:
            # Test electricity calculation
            test_cases = [
                {
                    "category": "electricity",
                    "subcategory": "grid",
                    "value": 1500,
                    "expected_lbs": 1380,  # 1500 * 0.92
                    "expected_kg": 625.96  # 1380 * 0.453592
                },
                {
                    "category": "transportation",
                    "subcategory": "gasoline",
                    "value": 10,
                    "expected_lbs": 196,  # 10 * 19.6
                    "expected_kg": 88.90  # 196 * 0.453592
                }
            ]
            
            all_passed = True
            for test_case in test_cases:
                if not self.department_ids:
                    continue
                    
                emission_data = {
                    "date": "2024-08-01",
                    "category": test_case["category"],
                    "subcategory": test_case["subcategory"],
                    "value": test_case["value"],
                    "department": self.department_ids[0],
                    "notes": f"Testing {test_case['category']} calculation"
                }
                
                response = requests.post(f"{BASE_URL}/emissions", 
                                       json=emission_data, headers=HEADERS, timeout=10)
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get("success"):
                        emission = data["data"]
                        actual_lbs = emission.get("co2Lbs", 0)
                        actual_kg = emission.get("co2Kg", 0)
                        
                        lbs_diff = abs(actual_lbs - test_case["expected_lbs"])
                        kg_diff = abs(actual_kg - test_case["expected_kg"])
                        
                        if lbs_diff < 0.1 and kg_diff < 0.1:
                            self.log_test(f"Emission calculation ({test_case['category']})", True,
                                        f"Calculation accurate: {actual_kg:.2f} kg CO2")
                        else:
                            self.log_test(f"Emission calculation ({test_case['category']})", False,
                                        f"Expected: {test_case['expected_kg']:.2f} kg, Got: {actual_kg:.2f} kg")
                            all_passed = False
                    else:
                        all_passed = False
                else:
                    all_passed = False
            
            return all_passed
            
        except Exception as e:
            self.log_test("Emission calculations", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Carbon Footprint Analytics Dashboard Backend Tests")
        print("=" * 70)
        
        # Test sequence
        tests = [
            ("Departments API", [
                self.test_get_departments,
                self.test_post_departments
            ]),
            ("Emissions API", [
                self.test_get_emissions,
                self.test_get_emissions_with_filters,
                self.test_post_emissions,
                self.test_post_emissions_bulk,
                self.test_put_emissions,
                self.test_delete_emissions
            ]),
            ("Analytics API", [
                self.test_get_analytics_summary,
                self.test_get_analytics_trends
            ]),
            ("Recommendations API", [
                self.test_get_recommendations
            ]),
            ("Calculations", [
                self.test_emission_calculations
            ])
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for category, test_functions in tests:
            print(f"\n📋 Testing {category}")
            print("-" * 40)
            
            for test_func in test_functions:
                total_tests += 1
                if test_func():
                    passed_tests += 1
        
        # Summary
        print("\n" + "=" * 70)
        print("🏁 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
            return True
        else:
            print(f"\n⚠️  {total_tests - passed_tests} tests failed. Check the details above.")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)