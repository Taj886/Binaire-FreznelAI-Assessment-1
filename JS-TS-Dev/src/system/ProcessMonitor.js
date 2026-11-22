
import si from "systeminformation";

class ProcessMonitor {
    async getProcessInfo(limit = 10) {
        const result = await si.processes();

        const processes = (result.list || [])
            .map((process) => ({
                pid: process.pid,
                name: process.name || "Unknown",
                cpu: Number(process.cpu || 0).toFixed(2),
                memory: Number(process.mem || 0).toFixed(2)
            }))
            .sort((a, b) => Number(b.cpu) - Number(a.cpu))
            .slice(0, limit);

        return {
            total: result.all || 0,
            running: result.running || 0,
            processes
        };
    }
}

export default ProcessMonitor;
