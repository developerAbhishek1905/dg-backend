import AllocationSettings from "../model/allocationSettings.model.js";
import { getAllocationSettings } from "./allocationSettings.service.js";
import { recalculatePerformance } from "../controller/allocationSettings.controller.js";

/*
|--------------------------------------------------------------------------
| MONTHLY ALLOCATION RECALCULATION
|--------------------------------------------------------------------------
|
| On the configured day of every month the performance of all dealers is
| recalculated for the previous one month:
|
|   day = 5, run on 5 Oct  ->  5 Sep 00:00  to  4 Oct 23:59:59
|
| The server checks every few minutes. A run is claimed atomically per month
| (lastScheduledRunKey) so it never runs twice, even with several servers.
|
*/

const CHECK_EVERY_MS = 10 * 60 * 1000;

export const previousMonthRange = (now, day) => ({
  from: new Date(now.getFullYear(), now.getMonth() - 1, day, 0, 0, 0, 0),
  // day - 1 of this month (day 1 -> last day of the previous month)
  to: new Date(now.getFullYear(), now.getMonth(), day - 1, 23, 59, 59, 999),
});

export const runMonthlyRecalculationIfDue = async (now = new Date()) => {
  const settings = await getAllocationSettings();

  if (!settings.monthlyRecalcEnabled) return null;

  const day = Number(settings.monthlyRecalcDay || 1);

  if (now.getDate() !== day) return null;

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Claim this month's run; null means it already ran (or is running)
  const claimed = await AllocationSettings.findOneAndUpdate(
    { key: "DEFAULT", lastScheduledRunKey: { $ne: monthKey } },
    { $set: { lastScheduledRunKey: monthKey, lastScheduledRunStatus: "RUNNING" } },
    { new: true },
  ).lean();

  if (!claimed) return null;

  const { from, to } = previousMonthRange(now, day);

  try {
    const summary = await recalculatePerformance({ from, to, settings });

    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      {
        $set: {
          lastScheduledRunAt: new Date(),
          lastScheduledRunStatus: `SUCCESS: ${summary.dealersUpdated} dealer(s)`,
        },
      },
    );

    console.log(`[allocation] monthly recalculation done (${summary.dealersUpdated} dealers)`);

    return summary;
  } catch (error) {
    console.error("[allocation] monthly recalculation failed:", error);

    // Release the claim so the next check retries today
    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      {
        $set: {
          lastScheduledRunKey: "",
          lastScheduledRunStatus: `FAILED: ${error.message}`,
        },
      },
    );

    return null;
  }
};

let timer = null;

export const startAllocationScheduler = () => {
  if (timer) return;

  const tick = () =>
    runMonthlyRecalculationIfDue().catch((error) =>
      console.error("[allocation] scheduler error:", error),
    );

  setTimeout(tick, 30 * 1000).unref?.();

  timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref?.();

  console.log("[allocation] monthly recalculation scheduler started");
};
