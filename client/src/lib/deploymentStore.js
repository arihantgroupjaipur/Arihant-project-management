class DeploymentStore {
    entries = [
        {
            id: "1",
            date: "2026-01-28",
            projectName: "Metro Station Alpha",
            location: "Downtown District",
            supervisor: "John Mitchell",
            status: "active",
            workerCount: 24,
            labourDetails: [
                { contractorName: "BuildCorp Ltd", plannedLabour: 10, actualLabour: 12 },
                { contractorName: "ConstructPro", plannedLabour: 8, actualLabour: 8 },
                { contractorName: "WorkForce Inc", plannedLabour: 6, actualLabour: 4 },
            ],
        },
        {
            id: "2",
            date: "2026-01-28",
            projectName: "Harbor Bridge Expansion",
            location: "Port Area, Sector 7",
            supervisor: "Sarah Chen",
            status: "active",
            workerCount: 45,
            labourDetails: [
                { contractorName: "SteelWorks Co", plannedLabour: 25, actualLabour: 25 },
                { contractorName: "BridgeBuilders", plannedLabour: 20, actualLabour: 20 },
            ],
        },
        {
            id: "3",
            date: "2026-01-27",
            projectName: "Solar Farm Installation",
            location: "Industrial Zone B",
            supervisor: "Mike Rodriguez",
            status: "pending",
            workerCount: 18,
            labourDetails: [
                { contractorName: "GreenEnergy Staff", plannedLabour: 18, actualLabour: 18 },
            ],
        },
    ];
    listeners = new Set();
    contractors = [
        { id: "c1", name: "BuildCorp Ltd" },
        { id: "c2", name: "ConstructPro" },
        { id: "c3", name: "WorkForce Inc" },
        { id: "c4", name: "SteelWorks Co" },
        { id: "c5", name: "BridgeBuilders" },
        { id: "c6", name: "GreenEnergy Staff" },
    ];

    getEntries() {
        return [...this.entries];
    }

    getContractors() {
        return [...this.contractors];
    }

    addContractor(name) {
        const newContractor = {
            id: `c-${Date.now()}`,
            name: name,
        };
        this.contractors = [newContractor, ...this.contractors];
        this.notifyListeners();
        return newContractor;
    }

    updateContractor(id, name) {
        this.contractors = this.contractors.map(c =>
            c.id === id ? { ...c, name } : c
        );
        this.notifyListeners();
    }

    deleteContractor(id) {
        this.contractors = this.contractors.filter(c => c.id !== id);
        this.notifyListeners();
    }

    addEntry(entry) {
        const newEntry = {
            ...entry,
            id: `entry-${Date.now()}`,
            isNew: true,
        };
        // Mark all existing entries as not new
        this.entries = this.entries.map(e => ({ ...e, isNew: false }));
        // Add new entry at the beginning
        this.entries = [newEntry, ...this.entries];
        // Notify all listeners
        this.notifyListeners();
        return newEntry;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
}
// Singleton instance
export const deploymentStore = new DeploymentStore();
