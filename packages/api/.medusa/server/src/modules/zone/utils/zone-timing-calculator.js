"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateZoneTiming = calculateZoneTiming;
const utils_1 = require("@medusajs/framework/utils");
const location_timing_1 = require("./location-timing");
function timeToMinutes(timeStr) {
    if (!timeStr)
        return 0;
    const timeParts = timeStr.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    return hours * 60 + minutes;
}
function minutesToTime(minutes) {
    if (minutes < 0)
        minutes = 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
async function calculateZoneTiming(scope, locationId, zoneId) {
    const query = scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const locationTiming = await (0, location_timing_1.fetchLocationTiming)(scope, locationId);
    let effectiveStartTime = locationTiming.start_time;
    let effectiveEndTime = locationTiming.end_time;
    if (zoneId && locationTiming.start_time && locationTiming.end_time) {
        try {
            const { data: instantPromises } = await query.graph({
                entity: "instant_promise",
                fields: ["id", "promise_minutes", "return_lead_minutes", "is_active"],
                filters: {
                    zone_id: zoneId,
                    is_active: true,
                },
            });
            if (instantPromises && instantPromises.length > 0) {
                const promise = instantPromises[0];
                const startTimeMinutes = timeToMinutes(locationTiming.start_time);
                const effectiveStartTimeMinutes = startTimeMinutes + promise.promise_minutes;
                effectiveStartTime = minutesToTime(effectiveStartTimeMinutes);
                const totalMinutesToSubtract = promise.promise_minutes + promise.return_lead_minutes;
                const endTimeMinutes = timeToMinutes(locationTiming.end_time);
                const effectiveEndTimeMinutes = endTimeMinutes - totalMinutesToSubtract;
                effectiveEndTime = minutesToTime(effectiveEndTimeMinutes);
            }
        }
        catch (error) {
            console.warn("Failed to fetch instant promises for zone timing calculation:", error);
        }
    }
    return {
        start_time: effectiveStartTime,
        end_time: locationTiming.end_time,
        effective_end_time: effectiveEndTime,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9uZS10aW1pbmctY2FsY3VsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3pvbmUvdXRpbHMvem9uZS10aW1pbmctY2FsY3VsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQStCQSxrREEyQ0M7QUExRUQscURBQXFFO0FBQ3JFLHVEQUF1RDtBQWV2RCxTQUFTLGFBQWEsQ0FBQyxPQUFlO0lBQ3BDLElBQUksQ0FBQyxPQUFPO1FBQUUsT0FBTyxDQUFDLENBQUE7SUFDdEIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNwQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDMUMsT0FBTyxLQUFLLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQTtBQUM3QixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxJQUFJLE9BQU8sR0FBRyxDQUFDO1FBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUN0QyxNQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFBO0lBQ3pCLE9BQU8sR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFBO0FBQ25GLENBQUM7QUFFTSxLQUFLLFVBQVUsbUJBQW1CLENBQ3ZDLEtBQTRDLEVBQzVDLFVBQWtCLEVBQ2xCLE1BQWU7SUFFZixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBUSxDQUFBO0lBQ25FLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBQSxxQ0FBbUIsRUFBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFFbkUsSUFBSSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFBO0lBQ2xELElBQUksZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQTtJQUU5QyxJQUFJLE1BQU0sSUFBSSxjQUFjLENBQUMsVUFBVSxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuRSxJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDbEQsTUFBTSxFQUFFLGlCQUFpQjtnQkFDekIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLFdBQVcsQ0FBQztnQkFDckUsT0FBTyxFQUFFO29CQUNQLE9BQU8sRUFBRSxNQUFNO29CQUNmLFNBQVMsRUFBRSxJQUFJO2lCQUNoQjthQUNGLENBQUMsQ0FBQTtZQUVGLElBQUksZUFBZSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQW1CLENBQUE7Z0JBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakUsTUFBTSx5QkFBeUIsR0FBRyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFBO2dCQUM1RSxrQkFBa0IsR0FBRyxhQUFhLENBQUMseUJBQXlCLENBQUMsQ0FBQTtnQkFFN0QsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQTtnQkFDcEYsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDN0QsTUFBTSx1QkFBdUIsR0FBRyxjQUFjLEdBQUcsc0JBQXNCLENBQUE7Z0JBQ3ZFLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0RBQStELEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEYsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPO1FBQ0wsVUFBVSxFQUFFLGtCQUFrQjtRQUM5QixRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVE7UUFDakMsa0JBQWtCLEVBQUUsZ0JBQWdCO0tBQ3JDLENBQUE7QUFDSCxDQUFDIn0=