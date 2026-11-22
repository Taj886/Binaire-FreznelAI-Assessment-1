import si from "systeminformation";

class DiskMonitor {

    async getDiskInfo() {
        const disks = await si.fsSize();

        return disks.map((disk) => ({
            filesystem: disk.fs,
            mount: disk.mount,
            total: (disk.size / (1024 ** 3)).toFixed(2),
            used: (disk.used / (1024 ** 3)).toFixed(2),
            usage: disk.use.toFixed(2)
        }));
    }
}

export default DiskMonitor;