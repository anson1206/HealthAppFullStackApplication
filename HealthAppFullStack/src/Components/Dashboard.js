import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/authContexts";
import { processFile, compressHealthData } from "./fileprocessing/FileProcessor";
import HeartRateSummary from "./fileprocessing/HeartRateSummary";
import EnergySummary from "./fileprocessing/EnergySummary";
import WorkoutsPieChart from "./HealthMetrics/WorkoutPieChart";
import SleepChart from "./HealthMetrics/SleepChart";
import StepsChart from "./HealthMetrics/StepsChart";
import ProfileForm from "./ProfileForm";
import TrendsChart from "./HealthMetrics/TrendsChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LineChart from "./fileprocessing/LineGraph";
import { saveUserHealthData, getUserHealthData, updateUserHealthData, uploadHealthFile } from "../api/healthService";
import { getUser, getProfile } from "../api/authService";
function Dashboard() {
    const { currentUser, userLoggedIn, signOut } = useAuth();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [heartRates, setHeartRates] = useState([]);
    const [energyData, setEnergyData] = useState([]);
    const [filteredEnergyState, setFilteredEnergyState] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [rangeMode, setRangeMode] = useState('day'); // 'day' or 'week'
    const [minDate, setMinDate] = useState(null);
    const [maxDate, setMaxDate] = useState(null);
    const [availableDatesSet, setAvailableDatesSet] = useState(new Set());
    const [availableDatesArr, setAvailableDatesArr] = useState([]);
    const [workouts, setWorkouts] = useState([]);
    const [filteredHeartState, setFilteredHeartState] = useState([]);
    const [sleep, setSleep] = useState([]);
    const [steps, setSteps] = useState([]);
    const [distances, setDistances] = useState([]);
    const [vitals, setVitals] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasHealthData, setHasHealthData] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('heart');
    const [profile, setProfile] = useState(() => {
        const u = getUser();
        return u || { name: '', email: currentUser ? currentUser.email : '', age: '', weight: '' };
    });
    
    const loadInProgressRef = useRef(false);
    const mountedRef = useRef(true);

    const loadUserHealthData = async () => {
        if (loadInProgressRef.current) {
            console.debug('loadUserHealthData: already in progress, skipping');
            return;
        }
        loadInProgressRef.current = true;
        try {
            const userData = await getUserHealthData(currentUser.uid);
            
            // ensure arrays are available for later date-range computation
            const hr = (userData && userData.heartRates) ? userData.heartRates : [];
            const en = (userData && userData.energyData) ? userData.energyData : [];
            const wo = (userData && userData.workouts) ? userData.workouts : [];
            const sl = (userData && userData.sleep) ? userData.sleep : [];
            const st = (userData && userData.steps) ? userData.steps : [];
            const ds = (userData && userData.distances) ? userData.distances : [];
                if (userData) {
                    setHeartRates(hr);
                    setEnergyData(en);
                    setWorkouts(wo);
                    setSleep(sl);
                    setSteps(st);
                    setDistances(ds);
                    if (userData.vitals) setVitals(userData.vitals);
                    setHasHealthData(true);
                
                if (userData.lastUpdated) {
                    try {
                        let lu = userData.lastUpdated;
                        if (lu && typeof lu.toDate === 'function') lu = lu.toDate();
                        const luDate = new Date(lu);
                        if (!isNaN(luDate) && mountedRef.current) setLastUpdated(luDate);
                    } catch (luErr) {
                        console.warn('Failed to parse lastUpdated', luErr);
                    }
                }
                
                console.log('User health data loaded:', userData);
            } else {
                setHasHealthData(false);
                console.log('No existing health data found');
            }
            // compute data range (min/max) from available datasets
            try {
                const allDates = [];
                const pushDate = (d) => { if (!d) return; const dt = new Date(d); if (!isNaN(dt)) allDates.push(dt); };
                hr.forEach(r => pushDate(r.date));
                en.forEach(r => pushDate(r.date));
                wo.forEach(r => { pushDate(r.startDate); pushDate(r.endDate); });
                sl.forEach(r => { pushDate(r.startDate); pushDate(r.endDate); });
                st.forEach(r => pushDate(r.date || r.startDate || r.endDate || r.timestamp));
                if (allDates.length > 0) {
                    const sorted = allDates.sort((a,b) => a - b);
                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];
                    if (mountedRef.current) {
                        setMinDate(first);
                        setMaxDate(last);
                        // set selectedDate safely using functional update to avoid stale closures
                        setSelectedDate(prev => {
                            if (!prev) {
                                console.debug('Setting selectedDate ->', last);
                                return last;
                            }
                            if (prev < first) return first;
                            if (prev > last) return last;
                            return prev;
                        });
                        // initialize filtered arrays immediately using the computed 'last' date
                        try {
                            const seed = last || new Date();
                            const computeRangeFiltered = (arr) => {
                                if (!seed || !arr) return [];
                                if (rangeMode === 'day') {
                                    const s = new Date(seed);
                                    s.setHours(0,0,0,0);
                                    const e = new Date(seed);
                                    e.setHours(23,59,59,999);
                                    return arr.filter(d => inRange(d.date, s, e));
                                } else {
                                    const s = startOfWeek(seed);
                                    const e = endOfWeek(seed);
                                    return arr.filter(d => inRange(d.date, s, e));
                                }
                            };
                            setFilteredEnergyState(computeRangeFiltered(en));
                            setFilteredHeartState(computeRangeFiltered(hr));
                        } catch (ferr) {
                            console.warn('Failed to initialize filtered arrays', ferr);
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to compute min/max dates', e);
            }
            // try to load server-side profile if available
            try {
                const stored = getUser();
                if (stored && stored.uid) {
                    const resp = await getProfile(stored.uid);
                    if (resp && resp.user) {
                        if (mountedRef.current) setProfile({ name: resp.user.name || '', email: resp.user.email || '', age: resp.user.age || '', weight: resp.user.weight || '' });
                    }
                }
            } catch (pfErr) {
                console.warn('No server profile loaded', pfErr.message || pfErr);
            }
        } catch (error) {
            console.error('Error loading user health data:', error);
            setErrorMessage('Failed to load your health data. Please try refreshing the page.');
        } finally {
            setLoading(false);
            loadInProgressRef.current = false;
        }
    };

    // Run once after login. Use `userLoggedIn` only to avoid re-triggering
    // when unrelated user object references change.
    useEffect(() => {
        if (!userLoggedIn) {
            navigate('/login');
            return;
        }
        if (currentUser) {
            console.debug('Calling loadUserHealthData');
            loadUserHealthData();
        }
        // intentionally depend only on userLoggedIn and navigate
    }, [userLoggedIn, navigate]);

    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const handleLogout = async () => {
        try {
            signOut();
            navigate("/login");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file.name);
            setSelectedFile(file);
        }
    };

 const handleUpload = async () => {
    if (!selectedFile || !currentUser) {
        setErrorMessage("Please select a file first.");
        return;
    }
    setLoading(true);
    setErrorMessage("");

    const RAW_UPLOAD_THRESHOLD = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size && selectedFile.size > RAW_UPLOAD_THRESHOLD) {
        // upload file as multipart/form-data to backend and let server parse
        try {
            const resp = await uploadHealthFile(selectedFile, currentUser.uid);
            console.log('Server upload response:', resp);
            // after successful upload, reload user data
            await loadUserHealthData();
            setErrorMessage('File uploaded and parsed on server successfully.');
        } catch (uerr) {
            console.error('Server upload failed', uerr);
            setErrorMessage('Server upload failed: ' + (uerr.message || uerr));
        } finally {
            setLoading(false);
            setSelectedFile(null);
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => input.value = '');
        }
        return;
    }

    // For smaller files, continue client-side processing
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const fileContent = event.target.result;
            const result = processFile(fileContent);

            if (result.error) {
                setErrorMessage(result.error);
                return;
            }

            // Check data size and compress if needed
            const dataSize = JSON.stringify(result).length;
            console.log(`Health data size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
            let finalData = result;
            if (dataSize > RAW_UPLOAD_THRESHOLD) {
                console.log('Compressing data due to size...');
                finalData = compressHealthData(result);
                setErrorMessage("Large dataset detected. Data has been sampled to improve performance.");
            }

            // Save to backend
            if (hasHealthData) {
                await updateUserHealthData(finalData, currentUser.uid);
            } else {
                await saveUserHealthData(finalData, currentUser.uid);
            }

            // Update local state
                        setHeartRates(finalData.heartRates || []);
                        setEnergyData(finalData.energyData || []);
                        setWorkouts(finalData.workouts || []);
                        setSleep(finalData.sleep || []);
                        setSteps(finalData.steps || []);
                        setDistances(finalData.distances || []);
                        if (finalData.vitals) setVitals(finalData.vitals || {});
            setHasHealthData(true);
            setLastUpdated(new Date());
            setSelectedDate(null);

            // Clear file input
            setSelectedFile(null);
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => input.value = '');

            console.log('Health data saved successfully');
        } catch (error) {
            console.error('Error processing and saving health data:', error);
            setErrorMessage('Failed to process and save your health data. The file might be too large.');
        } finally {
            setLoading(false);
        }
    };
    reader.readAsText(selectedFile);
};

    // Helpers for date ranges
    const startOfWeek = (d) => {
        const dt = new Date(d);
        const day = dt.getDay(); // 0 (Sun) - 6
        const diff = dt.getDate() - day; // start on Sunday
        const start = new Date(dt.setDate(diff));
        start.setHours(0,0,0,0);
        return start;
    };

    const endOfWeek = (d) => {
        const s = startOfWeek(d);
        const end = new Date(s);
        end.setDate(s.getDate() + 6);
        end.setHours(23,59,59,999);
        return end;
    };

    const inRange = (recordDate, start, end) => {
        const rd = new Date(recordDate);
        return rd >= start && rd <= end;
    };

    const filteredHeartData = (() => {
        // prefer the synced state which is set immediately after load
        if (filteredHeartState && filteredHeartState.length > 0) return filteredHeartState;
        if (!selectedDate) return [];
        if (rangeMode === 'day') {
            const s = new Date(selectedDate);
            s.setHours(0,0,0,0);
            const e = new Date(selectedDate);
            e.setHours(23,59,59,999);
            return heartRates.filter(d => inRange(d.date, s, e));
        } else {
            const s = startOfWeek(selectedDate);
            const e = endOfWeek(selectedDate);
            return heartRates.filter(d => inRange(d.date, s, e));
        }
    })();

    const filteredEnergyData = (() => {
        // prefer the synced state which is set immediately after load
        if (filteredEnergyState && filteredEnergyState.length > 0) return filteredEnergyState;
        if (!selectedDate) return [];
        if (rangeMode === 'day') {
            const s = new Date(selectedDate);
            s.setHours(0,0,0,0);
            const e = new Date(selectedDate);
            e.setHours(23,59,59,999);
            return energyData.filter(d => inRange(d.date, s, e));
        } else {
            const s = startOfWeek(selectedDate);
            const e = endOfWeek(selectedDate);
            return energyData.filter(d => inRange(d.date, s, e));
        }
    })();

    // helpers to clamp dates to data range
    const clampToRange = (d) => {
        if (!d) return d;
        if (minDate && d < minDate) return new Date(minDate);
        if (maxDate && d > maxDate) return new Date(maxDate);
        return d;
    };

    // Utility: normalize date -> YYYY-MM-DD
    const dateToYMD = (d) => {
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt.toISOString().slice(0,10);
    };

    // Build available dates set/array from datasets (includes ranges for start/end records)
    useEffect(() => {
        const s = new Set();
        const addDate = (d) => { const ymd = dateToYMD(d); if (ymd) s.add(ymd); };
        const addRange = (start, end) => {
            const a = new Date(start); const b = new Date(end);
            if (isNaN(a) || isNaN(b)) return;
            const cur = new Date(a);
            cur.setHours(0,0,0,0);
            const last = new Date(b);
            last.setHours(0,0,0,0);
            while (cur <= last) {
                s.add(dateToYMD(cur));
                cur.setDate(cur.getDate() + 1);
            }
        };

        heartRates.forEach(r => addDate(r.date));
        energyData.forEach(r => addDate(r.date));
        workouts.forEach(r => { if (r.startDate && r.endDate) addRange(r.startDate, r.endDate); else addDate(r.startDate); });
        sleep.forEach(r => { if (r.startDate && r.endDate) addRange(r.startDate, r.endDate); else addDate(r.startDate); });
        steps.forEach(r => addDate(r.date || r.startDate || r.endDate || r.timestamp));

        const arr = Array.from(s).map(ymd => new Date(ymd + 'T00:00:00Z')).filter(d => !isNaN(d));
        arr.sort((a,b) => a - b);
        setAvailableDatesSet(s);
        setAvailableDatesArr(arr);
    }, [heartRates, energyData, workouts, sleep, steps]);

    

    // keep filtered state in sync whenever the selected date or datasets change
    useEffect(() => {
        const computeFor = (arr) => {
            if (!selectedDate || !arr) return [];
            if (rangeMode === 'day') {
                const s = new Date(selectedDate);
                s.setHours(0,0,0,0);
                const e = new Date(selectedDate);
                e.setHours(23,59,59,999);
                return arr.filter(d => inRange(d.date, s, e));
            } else {
                const s = startOfWeek(selectedDate);
                const e = endOfWeek(selectedDate);
                return arr.filter(d => inRange(d.date, s, e));
            }
        };
        try {
            setFilteredEnergyState(computeFor(energyData));
            setFilteredHeartState(computeFor(heartRates));
        } catch (err) {
            console.warn('Error syncing filtered state', err);
        }
    }, [selectedDate, rangeMode, energyData, heartRates]);

    // helpers to find prev/next available date
    const prevAvailableDate = (d) => {
        if (!d || availableDatesArr.length === 0) return null;
        const cur = new Date(dateToYMD(d) + 'T00:00:00Z');
        for (let i = availableDatesArr.length - 1; i >= 0; i--) {
            if (availableDatesArr[i] < cur) return availableDatesArr[i];
        }
        return availableDatesArr[0];
    };
    const nextAvailableDate = (d) => {
        if (!d || availableDatesArr.length === 0) return null;
        const cur = new Date(dateToYMD(d) + 'T00:00:00Z');
        for (let i = 0; i < availableDatesArr.length; i++) {
            if (availableDatesArr[i] > cur) return availableDatesArr[i];
        }
        return availableDatesArr[availableDatesArr.length - 1];
    };

    

    // Chart data and options
    const chartData = {
        labels: filteredHeartData.map((d) =>
            new Date(d.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
        datasets: [
            {
                label: "Heart Rate BPM",
                data: filteredHeartData.map((d) => d.heartRate),
                borderColor: "rgba(75,192,192,1)",
                backgroundColor: "rgba(75,192,192,0.2)",
                fill: false,
                tension: 0.1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: { display: true, text: "Time" },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10,
                },
            },
            y: {
                title: { display: true, text: "BPM" },
            },
        },
    };

    // Build a simple energy chart dataset when needed
    const energyChartData = {
        labels: filteredEnergyData.map((d) =>
            new Date(d.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
        datasets: [
            {
                label: "Active Energy (kcal)",
                data: filteredEnergyData.map((d) => d.energy),
                borderColor: "rgba(255,99,132,1)",
                backgroundColor: "rgba(255,99,132,0.2)",
                fill: false,
                tension: 0.1,
            },
        ],
    };

    const renderMainContent = () => {
        switch (activeTab) {
            case 'heart':
                return (
                    <>
                        <div className="card">
                            <h3 className="text-lg font-bold text-center mb-4">Date Range</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    // jump to previous available date (or previous range)
                                    if (availableDatesArr.length > 0) {
                                        const cur = selectedDate ? selectedDate : (maxDate ? maxDate : null);
                                        const prev = prevAvailableDate(cur);
                                        if (prev) setSelectedDate(clampToRange(prev));
                                    } else {
                                        const now = selectedDate ? new Date(selectedDate) : (maxDate ? new Date(maxDate) : new Date());
                                        const sd = new Date(now);
                                        if (rangeMode === 'day') sd.setDate(sd.getDate() - 1);
                                        else sd.setDate(sd.getDate() - 7);
                                        setSelectedDate(clampToRange(sd));
                                    }
                                }} className="px-3 py-1 bg-gray-100 rounded">‹ Prev</button>

                                <div className="flex-1 text-center">
                                    <div className="text-sm text-gray-600">{rangeMode === 'day' ? 'Day View' : 'Week View'}</div>
                                    <div className="font-medium">{selectedDate ? (rangeMode === 'day' ? new Date(selectedDate).toLocaleDateString() : `${new Date(startOfWeek(selectedDate)).toLocaleDateString()} — ${new Date(endOfWeek(selectedDate)).toLocaleDateString()}`) : 'No date selected'}</div>
                                    {minDate && maxDate && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-3">
                                            <span>Data range: {new Date(minDate).toLocaleDateString()} → {new Date(maxDate).toLocaleDateString()}</span>
                                            <button onClick={() => setSelectedDate(new Date(minDate))} className="text-xs px-2 py-1 bg-gray-100 rounded">Go to First</button>
                                            <button onClick={() => setSelectedDate(new Date(maxDate))} className="text-xs px-2 py-1 bg-gray-100 rounded">Go to Last</button>
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => {
                                    if (availableDatesArr.length > 0) setSelectedDate(clampToRange(availableDatesArr[availableDatesArr.length - 1]));
                                    else setSelectedDate(clampToRange(new Date()));
                                }} className="px-3 py-1 bg-gray-100 rounded">Today</button>
                                <button onClick={() => {
                                    if (availableDatesArr.length > 0) {
                                        const cur = selectedDate ? selectedDate : (minDate ? minDate : null);
                                        const nxt = nextAvailableDate(cur);
                                        if (nxt) setSelectedDate(clampToRange(nxt));
                                    } else {
                                        const now = selectedDate ? new Date(selectedDate) : (minDate ? new Date(minDate) : new Date());
                                        const sd = new Date(now);
                                        if (rangeMode === 'day') sd.setDate(sd.getDate() + 1);
                                        else sd.setDate(sd.getDate() + 7);
                                        setSelectedDate(clampToRange(sd));
                                    }
                                }} className="px-3 py-1 bg-gray-100 rounded">Next ›</button>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <div className="ml-2">
                                    <button onClick={() => setRangeMode('day')} className={`px-3 py-1 rounded ${rangeMode==='day' ? 'bg-indigo-600 text-white':'bg-gray-100'}`}>Day</button>
                                    <button onClick={() => setRangeMode('week')} className={`ml-2 px-3 py-1 rounded ${rangeMode==='week' ? 'bg-indigo-600 text-white':'bg-gray-100'}`}>Week</button>
                                </div>

                                <div className="ml-4">
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(d) => setSelectedDate(d)}
                                        includeDates={availableDatesArr && availableDatesArr.length > 0 ? availableDatesArr : undefined}
                                        placeholderText="Pick a date"
                                        filterDate={(date) => {
                                            if (!availableDatesSet || availableDatesSet.size === 0) return true;
                                            return availableDatesSet.has(dateToYMD(date));
                                        }}
                                        dayClassName={(date) => {
                                            if (!availableDatesSet || availableDatesSet.size === 0) return '';
                                            return availableDatesSet.has(dateToYMD(date)) ? '' : 'text-gray-400 opacity-50';
                                        }}
                                        className="border rounded px-2 py-1"
                                    />
                                </div>

                                <div className="ml-auto flex gap-2">
                                    <button onClick={() => setSelectedDate(null)} className="text-sm text-blue-500 hover:underline">Clear</button>
                                    <button onClick={() => {
                                        if (availableDatesArr.length > 0) setSelectedDate(clampToRange(availableDatesArr[availableDatesArr.length - 1]));
                                        else setSelectedDate(clampToRange(new Date()));
                                    }} className="px-3 py-1 bg-gray-100 rounded">Today</button>
                                </div>
                            </div>
                        </div>

                        <div className="card space-y-6">
                            {heartRates.length > 0 && (
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex gap-4 mb-2">
                                        <div className="bg-gray-50 border rounded-lg p-3 flex-1">
                                            <p className="text-xs text-gray-500">Heart Rate</p>
                                            {heartStats ? (
                                                <div className="text-lg font-semibold">{heartStats.avg} bpm</div>
                                            ) : (
                                                <div className="text-sm text-gray-400">No data</div>
                                            )}
                                            {heartStats && <p className="text-xs text-gray-500">min {heartStats.min} • max {heartStats.max} • {heartStats.count} pts</p>}
                                        </div>
                                        <div className="bg-gray-50 border rounded-lg p-3 flex-1">
                                            <p className="text-xs text-gray-500">Active Energy</p>
                                            {energyStats ? (
                                                <div className="text-lg font-semibold">{energyStats.avg} kcal</div>
                                            ) : (
                                                <div className="text-sm text-gray-400">No data</div>
                                            )}
                                            {energyStats && <p className="text-xs text-gray-500">min {energyStats.min} • max {energyStats.max} • {energyStats.count} pts</p>}
                                        </div>
                                    </div>
                                    <EnergySummary energyData={filteredEnergyData} />
                                    <HeartRateSummary heartRates={filteredHeartData} />
                                </div>
                            )}

                            {selectedDate && filteredHeartData.length > 0 ? (
                                <div className="w-full h-[500px] p-4 bg-gray-50 rounded-lg shadow-lg">
                                    <LineChart data={chartData} options={chartOptions} />
                                </div>
                            ) : (
                                selectedDate && (
                                    <p className="text-center text-gray-600">No heart rate data available for {selectedDate.toLocaleDateString()}.</p>
                                )
                            )}
                        </div>
                    </>
                );
            case 'energy':
                return (
                    <div>
                        <div className="card">
                            <h3 className="text-lg font-bold mb-3">Active Energy</h3>
                            <EnergySummary energyData={filteredEnergyData} />
                        </div>
                        <div className="card mt-4">
                            <h3 className="text-lg font-bold mb-3">Energy Chart</h3>
                            <div className="w-full h-[420px] p-4 bg-gray-50 rounded-lg shadow-lg">
                                <LineChart data={energyChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>
                );
            case 'sleep':
                return (
                    <div className="card">
                        <h3 className="text-lg font-bold mb-3">Sleep</h3>
                        <SleepChart sleep={sleep} />
                    </div>
                );
            case 'steps':
                return (
                    <div className="card">
                        <h3 className="text-lg font-bold mb-3">Steps</h3>
                        <StepsChart steps={steps} />
                    </div>
                );
            case 'trends':
                        // build daily aggregates for key metrics
                        const aggregateByDay = (arr, valueField = 'value', sum = false) => {
                            const map = {};
                            const seenMap = {};
                            arr.forEach(r => {
                                const d = dateToYMD(r.date || r.startDate || r.timestamp);
                                if (!d) return;
                                const v = Number(r[valueField] ?? r.value ?? r.steps ?? 0);
                                // dedupe by date + value + time to avoid counting identical records twice
                                const timePart = (r.startDate || r.date || r.timestamp || '');
                                const key = `${d}|${v}|${timePart}`;
                                const src = r.source || null;
                                if (seenMap[key]) {
                                    // if an existing entry is from a non-workout source but this one is 'workout', prefer workout
                                    if ((seenMap[key].source !== 'workout') && (src === 'workout')) {
                                        seenMap[key] = { source: src, value: v };
                                    } else {
                                        return; // keep existing
                                    }
                                } else {
                                    seenMap[key] = { source: src, value: v };
                                }
                                if (!map[d]) map[d] = { date: d, value: 0, count: 0 };
                                map[d].count += 1;
                                map[d].value += v;
                            });
                            const out = Object.values(map).sort((a,b) => new Date(a.date) - new Date(b.date));
                            if (!sum) {
                                out.forEach(o => { if (o.count>0) o.value = o.value / o.count; });
                            }
                            return out;
                        };

                        const stepsDaily = aggregateByDay(steps, 'steps', true);
                        const energyDaily = aggregateByDay(energyData, 'energy', true);
                        // Keep distances in their original units (no conversion). Choose the most common unit for labeling.
                        const unitCounts = {};
                        (distances || []).forEach(d => {
                            const u = ((d.unit || d.originalUnit || '') + '').toString().toLowerCase() || 'unknown';
                            unitCounts[u] = (unitCounts[u] || 0) + 1;
                        });
                        const sortedUnits = Object.entries(unitCounts).sort((a,b) => b[1] - a[1]);
                        const preferredUnit = (sortedUnits.length > 0 && sortedUnits[0][0] !== 'unknown') ? sortedUnits[0][0] : null;
                        let distanceLabel = 'Distance';
                        if (preferredUnit) {
                            if (preferredUnit.includes('mi') || preferredUnit.includes('mile')) distanceLabel = 'Distance (mi)';
                            else if (preferredUnit.includes('km') || preferredUnit.includes('kilomet')) distanceLabel = 'Distance (km)';
                            else if (preferredUnit === 'm' || preferredUnit.includes('meter') || preferredUnit.includes('metre')) distanceLabel = 'Distance (m)';
                            else distanceLabel = `Distance (${preferredUnit})`;
                        } else {
                            distanceLabel = 'Distance';
                        }

                        // convert all distance entries to the preferred unit before aggregating
                        const KM_PER_MILE = 1.60934;
                        const M_PER_KM = 1000;
                        const M_PER_MILE = KM_PER_MILE * M_PER_KM;

                        const normalizeUnit = (u) => {
                            if (!u) return null;
                            const s = ('' + u).toLowerCase();
                            if (s.includes('mi') || s.includes('mile')) return 'mi';
                            if (s.includes('km') || s.includes('kilomet')) return 'km';
                            if (s === 'm' || s.includes('meter') || s.includes('metre')) return 'm';
                            return null;
                        };

                        const toPreferred = (val, fromUnit, preferred) => {
                            const v = Number(val) || 0;
                            const f = normalizeUnit(fromUnit);
                            if (!preferred) return v; // no conversion requested
                            if (preferred === 'mi') {
                                if (f === 'mi') return v;
                                if (f === 'km') return v / KM_PER_MILE;
                                if (f === 'm') return v / M_PER_MILE;
                                // unknown: heuristic
                                return v > 1000 ? (v / M_PER_MILE) : v;
                            }
                            if (preferred === 'km') {
                                if (f === 'km') return v;
                                if (f === 'mi') return v * KM_PER_MILE;
                                if (f === 'm') return v / M_PER_KM;
                                return v > 1000 ? (v / M_PER_KM) : v; // assume meters if large
                            }
                            if (preferred === 'm') {
                                if (f === 'm') return v;
                                if (f === 'km') return v * M_PER_KM;
                                if (f === 'mi') return v * M_PER_MILE;
                                return v; // unknown
                            }
                            return v;
                        };

                        const distancesRaw = (distances || []).map(d => {
                            const raw = Number(d.distance ?? d.originalValue ?? 0) || 0;
                            const fromUnit = d.unit || d.originalUnit || null;
                            const converted = preferredUnit ? toPreferred(raw, fromUnit, preferredUnit) : raw;
                            return { ...d, distance: converted };
                        });
                        const distanceDaily = aggregateByDay(distancesRaw, 'distance', true);
                const sleepDaily = (function(){
                    const map = {};
                    sleep.forEach(s => {
                        const start = new Date(s.startDate);
                        const end = new Date(s.endDate || s.startDate);
                        if (isNaN(start)) return;
                        const day = dateToYMD(start);
                        const dur = (end - start) / (1000*60*60);
                        if (!map[day]) map[day] = { date: day, value: 0 };
                        map[day].value += dur;
                    });
                    return Object.values(map).sort((a,b) => new Date(a.date) - new Date(b.date));
                })();

                const weightDaily = vitals && vitals.weight ? aggregateByDay(vitals.weight, 'value', false) : [];
                const restHrDaily = vitals && vitals.restingHeartRate ? aggregateByDay(vitals.restingHeartRate, 'value', false) : [];

                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Trends</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {weightDaily.length > 0 && <div className="card"><TrendsChart series={weightDaily} label="Weight (kg)" /></div>}
                            {restHrDaily.length > 0 && <div className="card"><TrendsChart series={restHrDaily} label="Resting Heart Rate (bpm)" /></div>}
                            {stepsDaily.length > 0 && <div className="card"><TrendsChart series={stepsDaily} label="Steps (daily)" /></div>}
                            {distanceDaily.length > 0 && <div className="card"><TrendsChart series={distanceDaily} label={distanceLabel} /></div>}
                            {sleepDaily.length > 0 && <div className="card"><TrendsChart series={sleepDaily} label="Sleep (hours)" /></div>}
                            {energyDaily.length > 0 && <div className="card"><TrendsChart series={energyDaily} label="Active Energy (kcal)" /></div>}
                        </div>
                    </div>
                );
            case 'workouts':
                return (
                    <div className="card">
                        <h3 className="text-lg font-bold mb-3">Workouts</h3>
                        {workouts && workouts.length > 0 ? (
                            <WorkoutsPieChart workouts={workouts} />
                        ) : (
                            <p className="text-center text-gray-600">No workout data available.</p>
                        )}
                    </div>
                );
            case 'profile':
                return (
                    <div className="card">
                        <ProfileForm profile={profile} onSave={(p) => setProfile(p)} />
                    </div>
                );
            default:
                return null;
        }
    };

    // Compute simple summary stats for display (min/avg/max)
    const computeStats = (arr, valueKey) => {
        if (!arr || arr.length === 0) return null;
        const nums = arr.map(d => Number(d[valueKey] || d.energy || d.heartRate || 0)).filter(n => !isNaN(n));
        if (nums.length === 0) return null;
        // compute sum, min, max via single pass to avoid spreading large arrays into Math.min/Math.max
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < nums.length; i++) {
            const v = nums[i];
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
        }
        const avg = sum / nums.length;
        return { min: Math.round(min), avg: Math.round(avg), max: Math.round(max), count: nums.length };
    };

    const heartStats = computeStats(heartRates, 'heartRate');
    const energyStats = computeStats(energyData, 'energy');

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <div className="text-white text-xl">Loading your health dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-300 to-pink-200">
            <header className="w-full bg-white/80 backdrop-blur-sm shadow-sm py-4 px-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-pink-500 flex items-center justify-center text-white font-bold">HA</div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900">Health Dashboard</h1>
                        {currentUser && (
                            <p className="text-sm text-gray-600">Welcome, {currentUser.email}</p>
                        )}
                        {lastUpdated && (
                            <p className="text-xs text-gray-500">
                                Last updated: {lastUpdated.toLocaleDateString()} at {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="btn-brand px-4 py-2 rounded-full shadow hover:opacity-95 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {errorMessage && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
                        <p>{errorMessage}</p>
                    </div>
                )}

                {!hasHealthData ? (
                    <div className="card mx-4">
                        <h2 className="text-2xl font-bold mb-4">
                            Upload your health data to get started
                        </h2>
                        <p className="text-gray-600 mb-4">
                            To get started, please upload your health data file in XML format.
                            Go to Health App → Profile → Export Health Data.
                        </p>
                        <div className="mb-4">
                            <input
                                type="file"
                                accept=".xml"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="mb-2 block w-full file-input"
                            />
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || loading}
                                className="btn-brand px-4 py-2 rounded-md hover:opacity-95 transition disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "Upload Health Data"}
                            </button>
                        </div>
                        
                        {/* Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                How to Export Your Apple Health Data
                            </h3>
                            <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
                                <li>Open the Health app on your iPhone</li>
                                <li>Tap your profile picture in the top right</li>
                                <li>Scroll down and tap "Export All Health Data"</li>
                                <li>Tap "Export" to confirm</li>
                                <li>Share or save the export.xml file</li>
                                <li>Upload the file here to view your health dashboard</li>
                            </ol>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="card mb-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Your Health Data</h2>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".xml"
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                        className="file-input"
                                    />
                                    <button
                                        onClick={handleUpload}
                                        disabled={!selectedFile || loading}
                                        className="btn-brand px-4 py-2 rounded-full disabled:opacity-50"
                                    >
                                        {loading ? "Updating..." : "Update Data"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex gap-2 flex-wrap mb-4">
                                {['heart','energy','workouts','sleep','steps','trends','profile'].map((t) => {
                                    const icons = { heart: '❤️', energy: '🔥', workouts: '🏋️', sleep: '🛌', steps: '🚶', trends: '📈', profile: '👤' };
                                    const label = t.charAt(0).toUpperCase() + t.slice(1);
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setActiveTab(t)}
                                            className={`px-3 py-1 rounded-md flex items-center gap-2 ${activeTab===t ? 'bg-indigo-600 text-white shadow-md transform -translate-y-0.5' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                            <span aria-hidden className="text-sm">{icons[t]}</span>
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-6">
                                {renderMainContent()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


export default Dashboard;