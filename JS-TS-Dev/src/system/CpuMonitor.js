
import si from "systeminformation";

class CpuMonitor {
    async getCpuInfo() {
        const [load, details] = await Promise.all([
            si.currentLoad(),
            si.cpu()
        ]);

        return {
            model: details.brand,
            cores: details.cores,
            usage: Number(load.currentLoad.toFixed(2)),
            perCore: (load.cpus || []).map((core, index) => ({
                core: index + 1,
                usage: Number(core.load.toFixed(2))
            }))
        };
    }
}

export default CpuMonitor;
