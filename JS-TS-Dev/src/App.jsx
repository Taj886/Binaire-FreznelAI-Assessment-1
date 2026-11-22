
import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useApp } from "ink";

import AuthService from "./auth/AuthService.js";

import CpuMonitor from "./system/CpuMonitor.js";
import MemoryMonitor from "./system/MemoryMonitor.js";
import DiskMonitor from "./system/DiskMonitor.js";
import NetworkMonitor from "./system/NetworkMonitor.js";
import HardwareMonitor from "./system/HardwareMonitor.js";
import ProcessMonitor from "./system/ProcessMonitor.js";

const initialData = {
    cpuInfo: null,
    memoryInfo: null,
    diskInfo: [],
    networkInfo: [],
    hardwareInfo: null,
    processInfo: null
};

const sections = [
    "CPU",
    "Memory",
    "Disk",
    "Network",
    "Hardware",
    "Processes"
];

const clamp = (value) =>
    Math.max(0, Math.min(100, Number(value) || 0));

const bar = (value, size = 18) => {
    const percentage = clamp(value);
    const filled = Math.round((percentage / 100) * size);

    return `${"█".repeat(filled)}${"░".repeat(size - filled)} ${percentage.toFixed(1)}%`;
};

const graph = (values, width = 35) => {
    const symbols = "▁▂▃▄▅▆▇█";

    if (!values || values.length === 0) {
        return "Waiting for data...";
    }

    const recent = values.slice(-width);

    return recent.map((value) => {
        const normalized = Math.max(
            0,
            Math.min(100, Number(value) || 0)
        );

        const index = Math.min(
            7,
            Math.floor(normalized / 12.5)
        );

        return symbols[index];
    }).join("");
};

const parseSpeed = (speed) => {
    if (!speed) return 0;

    const match = String(speed).match(
        /([\d.]+)\s*(B|KB|MB|GB|TB)?/i
    );

    if (!match) return 0;

    const value = Number(match[1]);
    const unit = (match[2] || "B").toUpperCase();

    const multiplier = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4
    };

    return value * (multiplier[unit] || 1);
};

const App = () => {
    const { exit } = useApp();

    // Authentication
    const [authScreen, setAuthScreen] = useState("welcome");
    const [authMode, setAuthMode] = useState("login");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [focusedField, setFocusedField] = useState("email");

    const [authMessage, setAuthMessage] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    // Terminal dimensions
    const [terminalSize, setTerminalSize] = useState({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24
    });

    // Dashboard
    const [data, setData] = useState(initialData);

    const [activeSection, setActiveSection] = useState(0);
    const [selectedProcess, setSelectedProcess] = useState(0);
    const [sortMode, setSortMode] = useState("cpu");

    // History
    const [cpuHistory, setCpuHistory] = useState([]);
    const [networkDownloadHistory, setNetworkDownloadHistory] = useState([]);
    const [networkUploadHistory, setNetworkUploadHistory] = useState([]);

    const [lastRefresh, setLastRefresh] = useState("");

    const width = terminalSize.width;
    const height = terminalSize.height;

    // Responsive layout
    const isVerySmall = width < 50 || height < 14;

    const isCompact = width < 120 || height < 38;

    const isWide = width >= 100;

    const showCpuDetails = !isCompact && height >= 28;
    const showNetworkGraphs = !isCompact && height >= 32;

    // Terminal resize listener
    useEffect(() => {
        const resize = () => {
            setTerminalSize({
                width: process.stdout.columns || 80,
                height: process.stdout.rows || 24
            });
        };

        process.stdout.on("resize", resize);

        resize();

        return () => {
            process.stdout.off("resize", resize);
        };
    }, []);

    // Firebase authentication
    const handleAuthentication = async () => {
        if (authLoading) return;

        if (!email.trim() || !password) {
            setAuthMessage("Email and password are required.");
            return;
        }

        if (password.length < 6) {
            setAuthMessage(
                "Password must contain at least 6 characters."
            );
            return;
        }

        setAuthLoading(true);
        setAuthMessage("Connecting to Firebase...");

        try {
            const result = authMode === "signup"
                ? await AuthService.signup(email.trim(), password)
                : await AuthService.login(email.trim(), password);

            if (result.success) {
                setIsAuthenticated(true);
                setAuthScreen("dashboard");

                setEmail("");
                setPassword("");
                setAuthMessage("");
            } else {
                setAuthMessage(
                    result.message || "Authentication failed."
                );
            }
        } catch (error) {
            setAuthMessage(
                error.message || "Authentication failed."
            );
        } finally {
            setAuthLoading(false);
        }
    };

    // Logout
    const logout = () => {
        setIsAuthenticated(false);
        setAuthScreen("welcome");

        setEmail("");
        setPassword("");
        setAuthMessage("");

        setData(initialData);

        setCpuHistory([]);
        setNetworkDownloadHistory([]);
        setNetworkUploadHistory([]);

        setActiveSection(0);
    };

    // Keyboard navigation
    useInput((input, key) => {

        // Quit
        if (
            input.toLowerCase() === "q" &&
            authScreen !== "form" &&
            !key.ctrl
        ) {
            exit();
            return;
        }

        if (key.ctrl && input === "c") {
            exit();
            return;
        }

        // Welcome screen
        if (!isAuthenticated && authScreen === "welcome") {

            if (input === "1" || input === "2") {
                setAuthMode(input === "1" ? "signup" : "login");

                setAuthScreen("form");
                setFocusedField("email");
                setAuthMessage("");
            }

            return;
        }

        // Login / Signup form
        if (!isAuthenticated && authScreen === "form") {

            if (key.escape) {
                setAuthScreen("welcome");

                setAuthMessage("");
                setEmail("");
                setPassword("");

                return;
            }

            if (key.tab) {
                setFocusedField((previous) =>
                    previous === "email" ? "password" : "email"
                );

                return;
            }

            if (key.return) {
                if (focusedField === "email") {
                    setFocusedField("password");
                } else {
                    handleAuthentication();
                }

                return;
            }

            if (key.backspace || key.delete) {
                if (focusedField === "email") {
                    setEmail((previous) => previous.slice(0, -1));
                } else {
                    setPassword((previous) => previous.slice(0, -1));
                }

                return;
            }

            if (input && !key.ctrl && !key.meta && !authLoading) {
                if (focusedField === "email") {
                    setEmail((previous) => previous + input);
                } else {
                    setPassword((previous) => previous + input);
                }
            }

            return;
        }

        // Dashboard controls
        if (isAuthenticated) {

            if (input.toLowerCase() === "q") {
                exit();
                return;
            }

            if (input.toLowerCase() === "l") {
                logout();
                return;
            }

            if (input.toLowerCase() === "s") {
                setSortMode((previous) =>
                    previous === "cpu" ? "memory" : "cpu"
                );

                setSelectedProcess(0);
                return;
            }

            // Left arrow: Previous panel
            if (key.leftArrow) {
                setActiveSection((previous) =>
                    previous === 0
                        ? sections.length - 1
                        : previous - 1
                );

                setSelectedProcess(0);
                return;
            }

            // Right arrow: Next panel
            if (key.rightArrow) {
                setActiveSection((previous) =>
                    (previous + 1) % sections.length
                );

                setSelectedProcess(0);
                return;
            }

            // Up arrow
            if (key.upArrow) {
                if (activeSection === 5) {
                    setSelectedProcess((previous) =>
                        Math.max(0, previous - 1)
                    );
                } else {
                    setActiveSection((previous) =>
                        previous === 0
                            ? sections.length - 1
                            : previous - 1
                    );
                }

                return;
            }

            // Down arrow
            if (key.downArrow) {
                if (activeSection === 5) {
                    setSelectedProcess((previous) =>
                        Math.min(
                            (data.processInfo?.processes?.length || 1) - 1,
                            previous + 1
                        )
                    );
                } else {
                    setActiveSection((previous) =>
                        (previous + 1) % sections.length
                    );
                }

                return;
            }

            if (key.return) {
                setActiveSection(5);
                return;
            }

            // Number shortcuts
            const number = Number(input);

            if (number >= 1 && number <= 6) {
                setActiveSection(number - 1);
                setSelectedProcess(0);
            }
        }
    });

    // System monitoring
    useEffect(() => {
        if (!isAuthenticated) return;

        const cpuMonitor = new CpuMonitor();
        const memoryMonitor = new MemoryMonitor();
        const diskMonitor = new DiskMonitor();
        const networkMonitor = new NetworkMonitor();
        const hardwareMonitor = new HardwareMonitor();
        const processMonitor = new ProcessMonitor();

        let mounted = true;
        let refreshing = false;

        const refresh = async () => {
            if (!mounted || refreshing) return;

            refreshing = true;

            try {
                const results = await Promise.allSettled([
                    cpuMonitor.getCpuInfo(),
                    memoryMonitor.getMemoryInfo(),
                    diskMonitor.getDiskInfo(),
                    networkMonitor.getNetworkInfo(),
                    hardwareMonitor.getHardwareInfo(),
                    processMonitor.getProcessInfo(10)
                ]);

                if (!mounted) return;

                const value = (index, fallback) =>
                    results[index].status === "fulfilled"
                        ? results[index].value
                        : fallback;

                const cpu = value(0, null);
                const memory = value(1, null);
                const disks = value(2, []);
                const networks = value(3, []);
                const hardware = value(4, null);
                const processes = value(5, null);

                setData((previous) => ({
                    cpuInfo: cpu || previous.cpuInfo,
                    memoryInfo: memory || previous.memoryInfo,
                    diskInfo: disks.length ? disks : previous.diskInfo,
                    networkInfo: networks.length
                        ? networks
                        : previous.networkInfo,
                    hardwareInfo: hardware || previous.hardwareInfo,
                    processInfo: processes || previous.processInfo
                }));

                if (cpu) {
                    setCpuHistory((previous) =>
                        [...previous, Number(cpu.usage)].slice(-50)
                    );
                }

                if (networks.length) {
                    const download = networks.reduce(
                        (sum, item) =>
                            sum + parseSpeed(item.downloadSpeed),
                        0
                    );

                    const upload = networks.reduce(
                        (sum, item) =>
                            sum + parseSpeed(item.uploadSpeed),
                        0
                    );

                    setNetworkDownloadHistory((previous) =>
                        [...previous, download].slice(-50)
                    );

                    setNetworkUploadHistory((previous) =>
                        [...previous, upload].slice(-50)
                    );
                }

                setLastRefresh(
                    new Date().toLocaleTimeString()
                );

            } catch (error) {
                
            } finally {
                refreshing = false;
            }
        };

        refresh();

        const timer = setInterval(refresh, 2000);

        return () => {
            mounted = false;
            clearInterval(timer);
        };

    }, [isAuthenticated]);

    // Extract monitoring data
    const {
        cpuInfo,
        memoryInfo,
        diskInfo,
        networkInfo,
        hardwareInfo,
        processInfo
    } = data;

    // Process sorting
    const processes = [
        ...(processInfo?.processes || [])
    ].sort((a, b) => {
        const first = Number(
            sortMode === "cpu" ? a.cpu : a.memory
        );

        const second = Number(
            sortMode === "cpu" ? b.cpu : b.memory
        );

        return second - first;
    });

    // Panel component
    const panel = (label, children, index) => (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={
                activeSection === index ? "green" : "gray"
            }
            paddingX={1}
            paddingY={0}
            flexShrink={1}
        >
            <Text
                color={activeSection === index ? "green" : "cyan"}
                bold
            >
                {` ${label} `}
            </Text>

            {children}
        </Box>
    );

    // Welcome screen
    if (!isAuthenticated && authScreen === "welcome") {
        return (
            <Box flexDirection="column" padding={1}>

                <Box
                    borderStyle="round"
                    borderColor="cyan"
                    padding={1}
                    flexDirection="column"
                >
                    <Text color="cyan" bold>
                        SYSTEM MONITOR
                    </Text>

                    <Text color="gray">
                        Terminal System Performance Dashboard
                    </Text>
                </Box>

                <Box
                    flexDirection="column"
                    borderStyle="round"
                    borderColor="green"
                    padding={1}
                    marginTop={1}
                >
                    <Text color="green" bold>
                        AUTHENTICATION
                    </Text>

                    <Text>1. Create New Account (Signup)</Text>
                    <Text>2. Existing User (Login)</Text>
                    <Text color="gray">
                        Press 1 or 2 to continue
                    </Text>
                </Box>

                <Text color="gray">Q: Exit</Text>

            </Box>
        );
    }

    // Login / Signup
    if (!isAuthenticated && authScreen === "form") {
        return (
            <Box flexDirection="column" padding={1}>

                <Box
                    borderStyle="round"
                    borderColor="cyan"
                    padding={1}
                    flexDirection="column"
                >
                    <Text color="cyan" bold>
                        {authMode === "signup"
                            ? "CREATE ACCOUNT"
                            : "USER LOGIN"}
                    </Text>

                    <Text color="gray">
                        Firebase Email & Password Authentication
                    </Text>
                </Box>

                <Box
                    flexDirection="column"
                    borderStyle="round"
                    borderColor="green"
                    padding={1}
                    marginTop={1}
                >
                    <Text color="yellow" bold>
                        {focusedField === "email" ? "> " : "  "}
                        Email Address
                    </Text>

                    <Text>
                        {email || "Type your email here..."}
                    </Text>

                    <Box marginTop={1}>
                        <Text color="yellow" bold>
                            {focusedField === "password" ? "> " : "  "}
                            Password
                        </Text>
                    </Box>

                    <Text>
                        {password
                            ? "*".repeat(password.length)
                            : "Type your password here..."}
                    </Text>

                    <Text color="gray">
                        TAB: Switch Field | ENTER: Submit | ESC: Back
                    </Text>

                    {authLoading && (
                        <Text color="yellow">
                            Please wait...
                        </Text>
                    )}

                    {authMessage !== "" && (
                        <Text color="red">
                            {authMessage}
                        </Text>
                    )}
                </Box>

            </Box>
        );
    }

    // Very small terminal
    if (isVerySmall) {
        return (
            <Box
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                padding={1}
            >
                <Text color="yellow" bold>
                    TERMINAL TOO SMALL
                </Text>

                <Text color="gray">
                    Increase terminal size to view dashboard.
                </Text>

                <Text color="gray">
                    Current: {width} x {height}
                </Text>

                <Text color="green">
                    Press Q to exit
                </Text>
            </Box>
        );
    }

    // Compact dashboard: keep every monitoring section visible at 167 x 35.
    if (height <= 37 && width >= 100) {
        const compactProcesses = processes.slice(0, 4);
        const compactDisks = diskInfo.slice(0, 2);
        const shortText = (value, max = 34) => {
            const text = String(value ?? "--");
            return text.length > max ? `${text.slice(0, max - 1)}…` : text;
        };
      
        const compactCoreRows = [];
        const compactCores = cpuInfo?.perCore || [];
        for (let i = 0; i < compactCores.length; i += 10) {
            compactCoreRows.push(compactCores.slice(i, i + 10));
        }

        return (
            <Box flexDirection="column" paddingX={1} paddingY={0}>
                <Box flexDirection="row" justifyContent="space-between">
                    <Text color="cyan" bold>SYSTEM MONITOR | REAL-TIME PERFORMANCE</Text>
                    <Text color="green" bold>● LIVE</Text>
                </Box>
                <Text color="gray">Updated: {lastRefresh || "Loading..."} | Terminal: {width} x {height}</Text>

                {panel(
                    "CPU PERFORMANCE",
                    <>
                        <Text color="green">
                            {shortText(cpuInfo?.model || "CPU information loading...", 64)}  |  Total: {cpuInfo ? bar(cpuInfo.usage, 14) : "Loading..."}
                        </Text>
                        <Text color="cyan" bold>
                            CORE USAGE
                        </Text>
                        {compactCoreRows.length ? compactCoreRows.map((row, rowIndex) => (
                            <Text key={`core-row-${rowIndex}`}>
                                {row.map((core) => `C${core.core}:${Number(core.usage).toFixed(0)}%`).join("   ")}
                            </Text>
                        )) : (
                            <Text color="gray">Per-core performance data loading...</Text>
                        )}
                    </>,
                    0
                )}

                <Box flexDirection="row" marginTop={1}>
                    <Box flexDirection="column" width="50%" paddingRight={1}>
                        {panel(
                            "MEMORY",
                            <Text>Used {memoryInfo?.used ?? "--"}/{memoryInfo?.total ?? "--"} GB  ({memoryInfo?.usage ?? "--"}%)</Text>,
                            1
                        )}
                        {panel(
                            "DISK",
                            <>
                                {compactDisks.length ? compactDisks.map((disk, i) => (
                                    <Text key={`${disk.mount}-${i}`}>{shortText(disk.mount, 12)} {disk.used}/{disk.total} GB ({disk.usage}%)</Text>
                                )) : <Text>Loading disk data...</Text>}
                            </>,
                            2
                        )}
                        {panel(
                            "NETWORK",
                            <>
                                {networkInfo.length ? networkInfo.slice(0, 1).map((network, i) => (
                                    <React.Fragment key={`${network.name}-${i}`}>
                                        <Text>{shortText(network.name, 24)} | {shortText(network.ip, 18)}</Text>
                                        <Text color="green">↓ {shortText(network.downloadSpeed, 18)}  <Text color="yellow">↑ {shortText(network.uploadSpeed, 18)}</Text></Text>
                                    </React.Fragment>
                                )) : <Text>Searching for network...</Text>}
                            </>,
                            3
                        )}
                    </Box>
                    <Box flexDirection="column" width="50%">
                        {panel(
                            "HARDWARE",
                            <>
                                <Text>CPU Temp: {shortText(hardwareInfo?.cpuTemperature || "Not Available", 24)}</Text>
                                <Text color="gray">{hardwareInfo?.controllers?.length
                                    ? `GPU: ${shortText(hardwareInfo.controllers[0].model, 34)}`
                                    : "GPU sensors unavailable"}</Text>
                            </>,
                            4
                        )}
                        {panel(
                            "PROCESS MANAGER",
                            <>
                                <Text>Total: {processInfo?.total ?? "--"} | Running: {processInfo?.running ?? "--"} | Sort: {sortMode.toUpperCase()}</Text>
                                <Text color="cyan" bold>{"PID".padEnd(8)}{"PROCESS".padEnd(19)}{"CPU".padStart(6)}{"MEM".padStart(6)}</Text>
                                {compactProcesses.length ? compactProcesses.map((process, index) => (
                                    <Text key={process.pid} color={selectedProcess === index ? "green" : "white"} bold={selectedProcess === index}>
                                        {selectedProcess === index ? ">" : " "}{String(process.pid).slice(0, 7).padEnd(7)}{shortText(process.name, 18).padEnd(19)}{String(process.cpu).slice(0, 5).padStart(6)}{String(process.memory).slice(0, 5).padStart(6)}
                                    </Text>
                                )) : <Text>Loading processes...</Text>}
                            </>,
                            5
                        )}
                    </Box>
                </Box>

                <Text color="green">1-6: Panels | ←/→: Focus | ↑/↓: Select | S: Sort | L: Logout | Q: Quit</Text>
            </Box>
        );
    }

    // Dashboard
    return (
        <Box
            flexDirection="column"
            padding={1}
        >

            {/* Header */}
            <Box
                flexDirection="row"
                justifyContent="space-between"
                borderStyle="round"
                borderColor="cyan"
                paddingX={1}
                paddingY={0}
            >
                <Box flexDirection="column">
                    <Text color="cyan" bold>
                        SYSTEM MONITOR
                    </Text>

                    <Text color="gray">
                        Real-time performance dashboard
                    </Text>
                </Box>

                <Box flexDirection="column" alignItems="flex-end">
                    <Text color="green" bold>
                        ● LIVE
                    </Text>

                    <Text color="gray">
                        {lastRefresh || "Loading..."}
                    </Text>
                </Box>
            </Box>

            {/* CPU Panel */}
            {panel(
                "CPU PERFORMANCE",
                <>
                    <Text>
                        Model: {cpuInfo?.model || "Loading..."}
                    </Text>

                    <Text>
                        Total: {cpuInfo
                            ? bar(cpuInfo.usage, isCompact ? 12 : 24)
                            : "Loading..."}
                    </Text>

                    {showCpuDetails && (
                        <>
                            <Text color="green">
                                History: {graph(cpuHistory, Math.min(40, width - 25))}
                            </Text>

                            <Text color="cyan" bold>
                                CORE USAGE
                            </Text>

                            <Box flexDirection="row" flexWrap="wrap">
                                {cpuInfo?.perCore?.map((core) => (
                                    <Box
                                        key={core.core}
                                        width={width >= 100 ? "25%" : "50%"}
                                    >
                                        <Text>
                                            C{core.core}: {bar(core.usage, 6)}
                                        </Text>
                                    </Box>
                                )) || (
                                    <Text>
                                        Loading core information...
                                    </Text>
                                )}
                            </Box>
                        </>
                    )}
                </>,
                0
            )}

            
            <Box
                flexDirection={isWide ? "row" : "column"}
                marginTop={1}
            >

                {/* Left column */}
                <Box
                    flexDirection="column"
                    width={isWide ? "50%" : "100%"}
                >

                    {/* Memory */}
                    {panel(
                        "MEMORY",
                        <>
                            <Text>
                                Total: {memoryInfo?.total ?? "--"} GB
                            </Text>

                            <Text>
                                Used: {memoryInfo?.used ?? "--"} GB
                            </Text>

                            <Text>
                                Free: {memoryInfo?.free ?? "--"} GB
                            </Text>

                            <Text>
                                {bar(memoryInfo?.usage, isCompact ? 14 : 22)}
                            </Text>
                        </>,
                        1
                    )}

                     {/* Disk */}

                    {panel(
                        "DISK",
                        <>
                            {diskInfo.length
                                ? diskInfo
                                    .slice(0, isCompact ? 2 : diskInfo.length)
                                    .map((disk, index) => (
                                        <Box
                                            key={`${disk.mount}-${index}`}
                                            flexDirection="column"
                                        >
                                            <Text bold>
                                                {disk.mount} ({disk.filesystem})
                                            </Text>

                                            <Text>
                                                Used: {disk.used} / {disk.total} GB
                                            </Text>

                                            <Text>
                                                {bar(disk.usage, isCompact ? 14 : 22)}
                                            </Text>
                                        </Box>
                                    ))
                                : (
                                    <Text>
                                        Loading disk information...
                                    </Text>
                                )}
                        </>,
                        2
                    )}

                    {/* Network */}
                    {panel(
                        "NETWORK",
                        <>
                            {networkInfo.length
                                ? networkInfo.map((network, index) => (
                                    <Box
                                        key={`${network.name}-${index}`}
                                        flexDirection="column"
                                    >
                                        <Text bold>
                                            {network.name} - {network.ip}
                                        </Text>

                                        <Text color="green">
                                            ↓ {network.downloadSpeed}
                                        </Text>

                                        <Text color="yellow">
                                            ↑ {network.uploadSpeed}
                                        </Text>
                                    </Box>
                                ))
                                : (
                                    <Text>
                                        Searching for network...
                                    </Text>
                                )}

                            {showNetworkGraphs && (
                                <>
                                    <Text color="green">
                                        Download: {graph(
                                            networkDownloadHistory.map(
                                                (value) => value > 0
                                                    ? Math.min(100, (Math.log10(value + 1) / 7) * 100)
                                                    : 0
                                            ),
                                            18
                                        )}
                                    </Text>

                                    <Text color="yellow">
                                        Upload: {graph(
                                            networkUploadHistory.map(
                                                (value) => value > 0
                                                    ? Math.min(100, (Math.log10(value + 1) / 7) * 100)
                                                    : 0
                                            ),
                                            18
                                        )}
                                    </Text>
                                </>
                            )}
                        </>,
                        3
                    )}

                </Box>

                {/* Right column */}
                <Box
                    flexDirection="column"
                    width={isWide ? "50%" : "100%"}
                >

                    {/* Hardware */}
                    {panel(
                        "GPU & HARDWARE",
                        <>
                            <Text>
                                CPU Temperature: {hardwareInfo?.cpuTemperature || "Not Available"}
                            </Text>

                            {hardwareInfo?.controllers?.length
                                ? hardwareInfo.controllers.map((gpu, index) => (
                                    <Box
                                        key={index}
                                        flexDirection="column"
                                    >
                                        <Text>GPU: {gpu.model}</Text>
                                        <Text>Vendor: {gpu.vendor}</Text>
                                        <Text>VRAM: {gpu.vram}</Text>
                                        <Text>Temperature: {gpu.temperature}</Text>
                                        <Text>Utilization: {gpu.utilization}</Text>
                                    </Box>
                                ))
                                : (
                                    <Text color="gray">
                                        GPU sensors unavailable
                                    </Text>
                                )}
                        </>,
                        4
                    )}

                    {/* Process Manager */}
                    {panel(
                        "PROCESS MANAGER",
                        <>
                            <Text>
                                Total: {processInfo?.total ?? "--"} |
                                Running: {processInfo?.running ?? "--"}
                            </Text>

                            <Text color="gray">
                                Sorted by {sortMode.toUpperCase()} | Press S to change
                            </Text>

                            <Text color="cyan" bold>
                                {"PID".padEnd(8)}
                                {"PROCESS".padEnd(20)}
                                {"CPU".padStart(7)}
                                {"MEM".padStart(7)}
                            </Text>

                            {processes.length
                                ? processes
                                    .slice(0, isCompact ? 4 : 10)
                                    .map((process, index) => (
                                        <Text
                                            key={process.pid}
                                            color={
                                                selectedProcess === index
                                                    ? "green"
                                                    : "white"
                                            }
                                            bold={selectedProcess === index}
                                        >
                                            {selectedProcess === index ? ">" : " "}
                                            {String(process.pid).padEnd(7)}
                                            {process.name.slice(0, 19).padEnd(20)}
                                            {String(process.cpu).padStart(7)}
                                            {String(process.memory).padStart(7)}
                                        </Text>
                                    ))
                                : (
                                    <Text>
                                        Loading processes...
                                    </Text>
                                )}
                        </>,
                        5
                    )}

                </Box>

            </Box>

            {/* Footer */}
            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="gray"
                paddingX={1}
                paddingY={0}
                marginTop={1}
            >
                {isCompact ? (
                    <Text color="green">
                        1-6: Panel | Arrows: Navigate/Select | S: Sort | L: Logout | Q: Quit
                    </Text>
                ) : (
                    <>
                        <Text color="green">
                            LEFT/RIGHT: Panel Focus | UP/DOWN: Select
                        </Text>
                        <Text color="green">
                            1-6: Direct Panel | S: Sort | L: Logout | Q: Quit
                        </Text>
                        <Text color="gray">
                            Auto Refresh: 2 seconds | Terminal: {width} x {height}
                        </Text>
                    </>
                )}
            </Box>

        </Box>
    );
};

export default App;
