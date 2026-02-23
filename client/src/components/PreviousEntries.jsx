import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Calendar, Building, MapPin, User, Users, FileText, Sheet, File, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

const PreviousEntries = ({ entries, onExport, isAdmin, onEdit, onDelete }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  return (
    <div className="glass-card p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">Daily Labour Deployments</h3>
          <p className="text-muted-foreground text-sm">Track all daily labour deployments across projects</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search project, location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full"
            />
          </div>
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="py-2 px-3 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg bg-white/5 border border-white/10 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl border-white/10 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
            <tr>
              <th className="p-4 whitespace-nowrap">Project</th>
              <th className="p-4 whitespace-nowrap">Date</th>
              <th className="p-4 whitespace-nowrap">Location</th>
              <th className="p-4 whitespace-nowrap">Supervisor</th>
              <th className="p-4 whitespace-nowrap text-center">Total Workers</th>
              <th className="p-4 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {(() => {
              if (!entries || entries.length === 0) {
                return (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-foreground">
                      No daily deployment entries yet.
                    </td>
                  </tr>
                );
              }

              const q = searchQuery.toLowerCase();
              const filtered = entries.filter(entry => {
                const matchSearch = !q ||
                  entry.projectName?.toLowerCase().includes(q) ||
                  entry.location?.toLowerCase().includes(q) ||
                  entry.supervisor?.toLowerCase().includes(q) ||
                  entry.labourDetails?.some(l => l.contractorName?.toLowerCase().includes(q));
                const matchDate = !filterDate || entry.date === filterDate;
                return matchSearch && matchDate;
              });

              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-foreground">
                      No entries match your search.
                    </td>
                  </tr>
                );
              }

              return filtered.map((entry) => (
                <>
                  <motion.tr
                    key={entry._id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{entry.projectName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {entry.date}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {entry.location}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {entry.supervisor}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <Users className="w-3 h-3 inline mr-1" />
                        {entry.workerCount}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && onEdit && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => onEdit(entry)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors"
                            title="Edit Entry"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Edit</span>
                          </motion.button>
                        )}
                        {isAdmin && onDelete && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => onDelete(entry)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Delete</span>
                          </motion.button>
                        )}
                        {onExport && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              onClick={() => onExport('pdf', entry)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                              title="Export as PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">PDF</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              onClick={() => onExport('excel', entry)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                              title="Export as Excel"
                            >
                              <Sheet className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">XLS</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              onClick={() => onExport('csv', entry)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                              title="Export as CSV"
                            >
                              <File className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">CSV</span>
                            </motion.button>
                          </>
                        )}
                        <motion.div
                          animate={{ rotate: expandedId === entry._id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="cursor-pointer"
                          onClick={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </td>
                  </motion.tr>

                  <AnimatePresence>
                    {expandedId === entry._id && (
                      <tr key={`${entry._id}-expanded`}>
                        <td colSpan="6" className="p-0 bg-white/2">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-white/10"
                          >
                            {entry.labourDetails && entry.labourDetails.length > 0 ? (
                              <div className="p-4 border-b border-white/5">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                  Labour Breakdown
                                </h5>
                                <div className="border rounded-lg border-white/10 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                                      <tr>
                                        <th className="p-3 text-left">Contractor</th>
                                        <th className="p-3 text-center">Planned</th>
                                        <th className="p-3 text-center">Actual</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                      {entry.labourDetails.map((labour, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                          <td className="p-3 text-foreground font-medium">{labour.contractorName}</td>
                                          <td className="p-3 text-center text-blue-400 font-semibold">{labour.plannedLabour}</td>
                                          <td className="p-3 text-center text-green-400 font-semibold">{labour.actualLabour}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : null}

                            {/* Material Consumption */}
                            {entry.materialConsumption && entry.materialConsumption.length > 0 && (
                              <div className="p-4">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                  Material Consumption
                                </h5>
                                <div className="border rounded-lg border-white/10 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                                      <tr>
                                        <th className="p-3 text-left">Material Name</th>
                                        <th className="p-3 text-center">Quantity</th>
                                        <th className="p-3 text-center">Unit</th>
                                        <th className="p-3 text-left">Work Order Ref</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                      {entry.materialConsumption.map((mat, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                          <td className="p-3 text-foreground font-medium">{mat.materialName}</td>
                                          <td className="p-3 text-center text-orange-400 font-semibold">{mat.totalQuantity}</td>
                                          <td className="p-3 text-center text-muted-foreground">{mat.unit}</td>
                                          <td className="p-3 text-muted-foreground">{mat.workOrderReference || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {(!entry.labourDetails || entry.labourDetails.length === 0) &&
                              (!entry.materialConsumption || entry.materialConsumption.length === 0) && (
                                <p className="p-4 text-sm text-muted-foreground">No details available.</p>
                              )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreviousEntries;
