
import si from "systeminformation";

class HardwareMonitor {
    async getHardwareInfo() {
        const [graphicsResult, sensorsResult, cpuTempResult] =
            await Promise.allSettled([
                si.graphics(),
                si.sensors(),
                si.cpuTemperature()
            ]);

        const graphics =
            graphicsResult.status === "fulfilled"
                ? graphicsResult.value
                : {};

        const sensors =
            sensorsResult.status === "fulfilled"
                ? sensorsResult.value
                : {};

        const cpuTemperature =
            cpuTempResult.status === "fulfilled"
                ? cpuTempResult.value?.main
                : null;

        const controllers = (graphics.controllers || []).map((gpu) => ({
            model: gpu.model || "Unknown",
            vendor: gpu.vendor || "Unknown",
            vram: gpu.vram ? `${gpu.vram} MB` : "Not Available",
            temperature:
                gpu.temperatureGpu != null
                    ? `${gpu.temperatureGpu} °C`
                    : "Not Available",
            utilization:
                gpu.utilizationGpu != null
                    ? `${gpu.utilizationGpu}%`
                    : "Not Available"
        }));

        return {
            controllers,
            cpuTemperature:
                cpuTemperature != null && cpuTemperature > 0
                    ? `${cpuTemperature} °C`
                    : "Not Available",
            gpuTemperature:
                sensors?.gpuTemperature != null
                    ? `${sensors.gpuTemperature} °C`
                    : "Not Available",
            fanSpeeds:
                Array.isArray(sensors?.fans) && sensors.fans.length > 0
                    ? sensors.fans.map((fan) => `${fan}`).join(", ") + " RPM"
                    : "Not Available"
        };
    }
}

export default HardwareMonitor;
