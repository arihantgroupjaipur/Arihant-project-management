import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or use Input
import { contractorService } from "@/services/contractorService";
import { createTask } from "@/services/taskService";
import { toast } from "sonner";

const TaskForm = ({ onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    const [workParticulars, setWorkParticulars] = useState("");
    const [contractorId, setContractorId] = useState("");
    const [plannedStartDate, setPlannedStartDate] = useState(null);
    const [plannedFinishDate, setPlannedFinishDate] = useState(null);
    const [duration, setDuration] = useState("");

    // Fetch contractors
    const { data: contractors = [], isLoading: isLoadingContractors } = useQuery({
        queryKey: ['contractors'],
        queryFn: contractorService.getAll
    });

    const createTaskMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success("Task assigned successfully");
            if (onSuccess) onSuccess();
        },
        onError: (error) => {
            toast.error(error || "Failed to assign task");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!workParticulars || !contractorId || !plannedStartDate || !plannedFinishDate || !duration) {
            toast.error("Please fill in all fields");
            return;
        }

        createTaskMutation.mutate({
            workParticulars,
            contractor: contractorId,
            plannedStartDate,
            plannedFinishDate,
            duration
        });
    };

    // Auto-calculate duration
    useEffect(() => {
        if (plannedStartDate && plannedFinishDate) {
            const days = differenceInDays(plannedFinishDate, plannedStartDate);
            if (days >= 0) {
                setDuration(`${days + 1} days`);
            } else {
                setDuration(""); // Reset if dates are invalid (end before start)
            }
        }
    }, [plannedStartDate, plannedFinishDate]);

    const currentTimestamp = format(new Date(), "dd/MM/yyyy hh:mm a");

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Current Timestamp</label>
                    <Input value={currentTimestamp} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Contractor Name</label>
                    <Select value={contractorId} onValueChange={setContractorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Contractor" />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingContractors ? (
                                <div className="p-2 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>
                            ) : (
                                contractors.length > 0 ? (
                                    contractors.map((c) => (
                                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground text-center">No contractors found</div>
                                )
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Work Particulars</label>
                    <Input
                        value={workParticulars}
                        onChange={(e) => setWorkParticulars(e.target.value)}
                        placeholder="Enter work details..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Planned Start Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !plannedStartDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {plannedStartDate ? format(plannedStartDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={plannedStartDate}
                                onSelect={setPlannedStartDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Planned Finish Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !plannedFinishDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {plannedFinishDate ? format(plannedFinishDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={plannedFinishDate}
                                onSelect={setPlannedFinishDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Work Duration</label>
                    <Input
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 5 days"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign Task
                </Button>
            </div>
        </form>
    );
};

export default TaskForm;
