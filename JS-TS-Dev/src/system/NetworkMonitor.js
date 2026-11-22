
import si from "systeminformation";

class NetworkMonitor {
    formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";

        const units = ["B", "KB", "MB", "GB", "TB"];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));

        const value = bytes / (1024 ** index);

        return `${value.toFixed(2)} ${units[index]}`;
    }

    formatSpeed(bytesPerSecond) {
        return `${this.formatBytes(bytesPerSecond)}/s`;
    }

    async getNetworkInfo() {
        const [interfaces, stats] = await Promise.all([
            si.networkInterfaces(),
            si.networkStats()
        ]);

        return stats
            .filter((stat) => stat.iface !== "lo")
            .map((stat) => {
                const networkInterface = interfaces.find(
                    (item) => item.iface === stat.iface
                );

                if (networkInterface?.internal) {
                    return null;
                }

                return {
                    name: stat.iface,
                    ip: networkInterface?.ip4 || "N/A",
                    downloadSpeed: this.formatSpeed(stat.rx_sec),
                    uploadSpeed: this.formatSpeed(stat.tx_sec),
                    received: this.formatBytes(stat.rx_bytes),
                    sent: this.formatBytes(stat.tx_bytes)
                };
            })
            .filter(Boolean);
    }
}

export default NetworkMonitor;
