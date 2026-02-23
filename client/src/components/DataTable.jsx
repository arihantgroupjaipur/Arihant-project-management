import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Calendar, Building, Users, FileText, Sheet, File } from "lucide-react";
import { useMemo } from "react";

const DataTable = ({ entries, onExport }) => {
  // Group entries by date
  const groupedByDate = useMemo(() => {
    const groups = {};

    entries.forEach(entry => {
      const date = entry.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    // Sort dates in descending order (newest first)
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .reduce((acc, date) => {
        acc[date] = groups[date];
        return acc;
      }, {});
  }, [entries]);

  // Calculate total planned and actual workers from labourDetails
  const calculateWorkers = (entries) => {
    if (!entries || entries.length === 0) {
      return { planned: 0, actual: 0 };
    }

    let totalPlanned = 0;
    let totalActual = 0;

    entries.forEach(entry => {
      if (entry.labourDetails && entry.labourDetails.length > 0) {
        entry.labourDetails.forEach(detail => {
          totalPlanned += detail.plannedLabour || 0;
          totalActual += detail.actualLabour || 0;
        });
      }
    });

    return { planned: totalPlanned, actual: totalActual };
  };

  const calculateEntryWorkers = (entry) => {
    if (!entry.labourDetails || entry.labourDetails.length === 0) {
      return { planned: 0, actual: 0 };
    }

    const planned = entry.labourDetails.reduce((sum, detail) => sum + (detail.plannedLabour || 0), 0);
    const actual = entry.labourDetails.reduce((sum, detail) => sum + (detail.actualLabour || 0), 0);

    return { planned, actual };
  };

  if (entries.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground">No deployment entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {Object.entries(groupedByDate).map(([date, dateEntries], dateIndex) => {
          const dayTotals = calculateWorkers(dateEntries);
          const dayVariance = dayTotals.actual - dayTotals.planned;

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: dateIndex * 0.1 }}
              className="glass-card overflow-hidden"
            >
              {/* Date Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{date}</h3>
                    <p className="text-sm text-muted-foreground">
                      {dateEntries.length} {dateEntries.length === 1 ? 'project' : 'projects'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Entries for this date */}
              <div className="divide-y divide-white/5">
                {dateEntries.map((entry, entryIndex) => {
                  const { planned, actual } = calculateEntryWorkers(entry);
                  const variance = actual - planned;

                  return (
                    <motion.div
                      key={entry._id || entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entryIndex * 0.05 }}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Project Details and Export Buttons */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Project */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="w-4 h-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Project</span>
                            </div>
                            <p className="font-semibold">{entry.projectName}</p>
                          </div>

                          {/* Location */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-secondary" />
                              <span className="text-xs text-muted-foreground">Location</span>
                            </div>
                            <p className="font-medium">{entry.location}</p>
                          </div>

                          {/* Supervisor */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Supervisor</span>
                            </div>
                            <p className="font-medium">{entry.supervisor}</p>
                          </div>

                          {/* Workers */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Workers</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-blue-400 font-semibold">
                                P: {planned}
                              </span>
                              <span className="text-green-400 font-semibold">
                                A: {actual}
                              </span>
                              {variance !== 0 && (
                                <Badge
                                  variant={variance > 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {variance > 0 ? '+' : ''}{variance}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Export Buttons for this project */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onExport('pdf', [entry], date)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="Export as PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">PDF</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onExport('excel', [entry], date)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                            title="Export as Excel"
                          >
                            <Sheet className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">XLS</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onExport('csv', [entry], date)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                            title="Export as CSV"
                          >
                            <File className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">CSV</span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Day Total */}
              <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Day Total</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">
                        Planned: {dayTotals.planned}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">
                        Actual: {dayTotals.actual}
                      </span>
                    </div>
                    {dayVariance !== 0 && (
                      <Badge
                        variant={dayVariance > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {dayVariance > 0 ? '+' : ''}{dayVariance}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default DataTable;
