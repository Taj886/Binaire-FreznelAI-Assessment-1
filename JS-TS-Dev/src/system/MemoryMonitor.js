
import si from "systeminformation";

class MemoryMonitor {

    async getMemoryInfo() {
        const memory = await si.mem();

        const totalMemory = memory.total;
        const usedMemory = memory.used;
        const freeMemory = memory.available;

        return {
            total: (totalMemory / (1024 ** 3)).toFixed(2),
            used: (usedMemory / (1024 ** 3)).toFixed(2),
            free: (freeMemory / (1024 ** 3)).toFixed(2),
            usage: ((usedMemory / totalMemory) * 100).toFixed(2)
        };
    }
}

export default MemoryMonitor;
